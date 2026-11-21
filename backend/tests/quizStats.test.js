process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:5173';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const swaggerSpec = require('../src/config/swagger');
const Quiz = require('../src/models/Quiz');
const User = require('../src/models/User');
const { collectErrors, responseSchema } = require('./helpers/matchesSchema');

let mongod;
const ownerId = new mongoose.Types.ObjectId();
const ROUTE = '/api/quizzes/{id}/stats';
const OLD_DATE = new Date('2026-01-01T00:00:00.000Z');

function expectMatchesSwagger(body, status = '200') {
  const errors = collectErrors(body, responseSchema(swaggerSpec, ROUTE, 'post', status), swaggerSpec);
  expect(errors).toEqual([]);
}

const statsUrl = (id) => `/api/quizzes/${id}/stats`;

function seedQuiz(overrides = {}) {
  return Quiz.create({ title: 'Space trivia', owner: ownerId, ageGroup: 'adults', ...overrides });
}

async function signUp(email = 'player@example.com') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name: 'Tester', email, password: 'password123' });
  expect(res.status).toBe(201);
  return { agent, id: res.body.user._id };
}

async function seedResult(userId, quizId, correctAnswers, totalQuestions) {
  await User.updateOne(
    { _id: userId },
    { $push: { results: { quiz: quizId, correctAnswers, totalQuestions, date: OLD_DATE } } }
  );
}

async function resultsOf(userId) {
  const user = await User.findById(userId).lean();
  return user.results;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await Promise.all([Quiz.deleteMany({}), User.deleteMany({})]);
});

describe('POST /api/quizzes/:id/stats', () => {
  describe('as a guest', () => {
    it('works without a cookie: increases passCount and returns the stats', async () => {
      const quiz = await seedQuiz({ passCount: 4, rating: 4.5 });

      const res = await request(app).post(statsUrl(quiz._id)).send({ total: 10, correct: 7 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ passCount: 5, totalQuestions: 10, correctAnswers: 7, rating: 4.5 });
      expectMatchesSwagger(res.body);
      expect((await Quiz.findById(quiz._id)).passCount).toBe(5);
    });

    it('counts every submission', async () => {
      const quiz = await seedQuiz();

      await request(app).post(statsUrl(quiz._id)).send({ total: 3, correct: 1 });
      const res = await request(app).post(statsUrl(quiz._id)).send({ total: 3, correct: 3 });

      expect(res.body.passCount).toBe(2);
    });

    it('counts parallel submissions without losing any', async () => {
      const quiz = await seedQuiz();

      await Promise.all(
        Array.from({ length: 5 }, () => request(app).post(statsUrl(quiz._id)).send({ total: 4, correct: 2 }))
      );

      expect((await Quiz.findById(quiz._id)).passCount).toBe(5);
    });

    it('does not change other quizzes', async () => {
      const quiz = await seedQuiz();
      const other = await seedQuiz({ title: 'Other quiz', passCount: 3 });

      await request(app).post(statsUrl(quiz._id)).send({ total: 4, correct: 2 });

      expect((await Quiz.findById(other._id)).passCount).toBe(3);
    });

    it('treats an invalid or expired cookie as a guest instead of failing', async () => {
      const quiz = await seedQuiz();

      const res = await request(app)
        .post(statsUrl(quiz._id))
        .set('Cookie', 'token=not-a-jwt')
        .send({ total: 5, correct: 5 });

      expect(res.status).toBe(200);
      expect(res.body.passCount).toBe(1);
    });
  });

  describe('validation', () => {
    it.each([
      ['total is missing', { correct: 3 }],
      ['correct is missing', { total: 10 }],
      ['the body is empty', {}],
      ['total is 0', { total: 0, correct: 0 }],
      ['total is above 100', { total: 101, correct: 5 }],
      ['total is not an integer', { total: 5.5, correct: 2 }],
      ['total is not a number', { total: 'many', correct: 1 }],
      ['correct is negative', { total: 10, correct: -1 }],
      ['correct is above total', { total: 10, correct: 11 }],
      ['correct is not an integer', { total: 10, correct: 2.5 }],
      ['correct is not a number', { total: 10, correct: 'all' }]
    ])('returns 400 and does not count the pass when %s', async (_name, body) => {
      const quiz = await seedQuiz();

      const res = await request(app).post(statsUrl(quiz._id)).send(body);

      expect(res.status).toBe(400);
      expectMatchesSwagger(res.body, '400');
      expect((await Quiz.findById(quiz._id)).passCount).toBe(0);
    });

    it.each([
      [{ total: 1, correct: 0 }],
      [{ total: 1, correct: 1 }],
      [{ total: 100, correct: 100 }],
      [{ total: 10, correct: 0 }]
    ])('accepts the boundary value %j', async (body) => {
      const quiz = await seedQuiz();

      const res = await request(app).post(statsUrl(quiz._id)).send(body);

      expect(res.status).toBe(200);
      expect(res.body.totalQuestions).toBe(body.total);
      expect(res.body.correctAnswers).toBe(body.correct);
    });

    it('explains that correct must not exceed total', async () => {
      const quiz = await seedQuiz();

      const res = await request(app).post(statsUrl(quiz._id)).send({ total: 3, correct: 4 });

      expect(res.body.message).toMatch(/correct.*less than or equal to.*total/);
    });

    it('accepts numeric strings (the body is converted like in other endpoints)', async () => {
      const quiz = await seedQuiz();

      const res = await request(app).post(statsUrl(quiz._id)).send({ total: '10', correct: '7' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ totalQuestions: 10, correctAnswers: 7 });
    });

    it('returns 400 for an invalid quiz id', async () => {
      const res = await request(app).post('/api/quizzes/not-an-id/stats').send({ total: 5, correct: 3 });

      expect(res.status).toBe(400);
      expectMatchesSwagger(res.body, '400');
    });

    it('returns 404 when the quiz does not exist', async () => {
      const res = await request(app)
        .post(statsUrl(new mongoose.Types.ObjectId()))
        .send({ total: 5, correct: 3 });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Quiz not found');
      expectMatchesSwagger(res.body, '404');
    });

    it('does not save anything to the profile when the quiz does not exist', async () => {
      const { agent, id } = await signUp();

      const res = await agent.post(statsUrl(new mongoose.Types.ObjectId())).send({ total: 5, correct: 3 });

      expect(res.status).toBe(404);
      expect(await resultsOf(id)).toEqual([]);
    });
  });

  describe('as an authenticated user', () => {
    it('saves the first result to the profile', async () => {
      const quiz = await seedQuiz();
      const { agent, id } = await signUp();

      const res = await agent.post(statsUrl(quiz._id)).send({ total: 10, correct: 6 });

      expect(res.status).toBe(200);
      expect(res.body.passCount).toBe(1);
      const results = await resultsOf(id);
      expect(results).toHaveLength(1);
      expect(String(results[0].quiz)).toBe(String(quiz._id));
      expect(results[0]).toMatchObject({ correctAnswers: 6, totalQuestions: 10 });
    });

    it('updates the stored result when the new one is better', async () => {
      const quiz = await seedQuiz();
      const { agent, id } = await signUp();
      await seedResult(id, quiz._id, 5, 10);

      const res = await agent.post(statsUrl(quiz._id)).send({ total: 10, correct: 8 });

      expect(res.status).toBe(200);
      const results = await resultsOf(id);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ correctAnswers: 8, totalQuestions: 10 });
      expect(results[0].date.getTime()).toBeGreaterThan(OLD_DATE.getTime());
    });

    it('keeps the stored result when the new one is worse, but still counts the pass', async () => {
      const quiz = await seedQuiz({ passCount: 2 });
      const { agent, id } = await signUp();
      await seedResult(id, quiz._id, 8, 10);

      const res = await agent.post(statsUrl(quiz._id)).send({ total: 10, correct: 3 });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ passCount: 3, totalQuestions: 10, correctAnswers: 3 });
      const results = await resultsOf(id);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({ correctAnswers: 8, totalQuestions: 10 });
      expect(results[0].date.getTime()).toBe(OLD_DATE.getTime());
    });

    it('keeps the stored result when the new one is equal', async () => {
      const quiz = await seedQuiz();
      const { agent, id } = await signUp();
      await seedResult(id, quiz._id, 7, 10);

      await agent.post(statsUrl(quiz._id)).send({ total: 10, correct: 7 });

      const results = await resultsOf(id);
      expect(results).toHaveLength(1);
      expect(results[0].date.getTime()).toBe(OLD_DATE.getTime());
    });

    it('compares the share of correct answers when the number of questions changed', async () => {
      const quiz = await seedQuiz();
      const { agent, id } = await signUp();
      await seedResult(id, quiz._id, 5, 10);

      await agent.post(statsUrl(quiz._id)).send({ total: 3, correct: 2 });

      expect((await resultsOf(id))[0]).toMatchObject({ correctAnswers: 2, totalQuestions: 3 });

      await agent.post(statsUrl(quiz._id)).send({ total: 20, correct: 12 });

      expect((await resultsOf(id))[0]).toMatchObject({ correctAnswers: 2, totalQuestions: 3 });
    });

    it('keeps one entry per quiz and does not touch results of other quizzes', async () => {
      const first = await seedQuiz();
      const second = await seedQuiz({ title: 'Second quiz' });
      const { agent, id } = await signUp();
      await seedResult(id, second._id, 4, 10);

      await agent.post(statsUrl(first._id)).send({ total: 5, correct: 2 });
      await agent.post(statsUrl(first._id)).send({ total: 5, correct: 4 });

      const results = await resultsOf(id);
      expect(results).toHaveLength(2);
      const byQuiz = Object.fromEntries(results.map((result) => [String(result.quiz), result]));
      expect(byQuiz[String(first._id)]).toMatchObject({ correctAnswers: 4, totalQuestions: 5 });
      expect(byQuiz[String(second._id)]).toMatchObject({ correctAnswers: 4, totalQuestions: 10 });
    });

    it('does not touch results of other users', async () => {
      const quiz = await seedQuiz();
      const { agent } = await signUp('first@example.com');
      const other = await signUp('second@example.com');

      await agent.post(statsUrl(quiz._id)).send({ total: 5, correct: 5 });

      expect(await resultsOf(other.id)).toEqual([]);
    });

    it('does not remove favorites while saving the result', async () => {
      const quiz = await seedQuiz();
      const { agent, id } = await signUp();
      await User.updateOne({ _id: id }, { $push: { favorites: quiz._id } });

      await agent.post(statsUrl(quiz._id)).send({ total: 5, correct: 5 });

      const user = await User.findById(id).lean();
      expect(user.favorites.map(String)).toEqual([String(quiz._id)]);
    });

    it('shows the saved result in GET /api/quizzes/last-passed', async () => {
      const quiz = await seedQuiz();
      const { agent } = await signUp();

      await agent.post(statsUrl(quiz._id)).send({ total: 10, correct: 9 });
      const res = await agent.get('/api/quizzes/last-passed');

      expect(res.status).toBe(200);
      expect(res.body.quizzes).toHaveLength(1);
      expect(res.body.quizzes[0].lastResult).toMatchObject({ correctAnswers: 9, totalQuestions: 10 });
      expect(res.body.quizzes[0].passCount).toBe(1);
    });
  });

  describe('Swagger', () => {
    it('documents the endpoint with the request body and all response codes', () => {
      const operation = swaggerSpec.paths[ROUTE].post;

      expect(operation.parameters.map((parameter) => parameter.name)).toContain('id');
      expect(operation.requestBody.content['application/json'].schema.required).toEqual(['total', 'correct']);
      expect(Object.keys(operation.responses)).toEqual(expect.arrayContaining(['200', '400', '404']));
      expect(operation.security).toBeUndefined();
    });
  });
});
