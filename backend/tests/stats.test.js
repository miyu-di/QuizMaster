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

function expectMatchesSwagger(body, route, status = '200') {
  const errors = collectErrors(body, responseSchema(swaggerSpec, route, 'get', status), swaggerSpec);
  expect(errors).toEqual([]);
}

function seedQuiz(overrides = {}) {
  return Quiz.create({ title: 'Space trivia', owner: ownerId, ...overrides });
}

async function signUp(email = 'player@example.com') {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name: 'Tester', email, password: 'password123' });
  expect(res.status).toBe(201);
  return { agent, id: res.body.user._id };
}

function seedResult(userId, quizId, correctAnswers, totalQuestions) {
  return User.updateOne(
    { _id: userId },
    { $push: { results: { quiz: quizId, correctAnswers, totalQuestions, date: new Date() } } }
  );
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

describe('GET /api/stats', () => {
  it('is public and returns 0 when there are no quizzes', async () => {
    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ passedCount: 0 });
    expectMatchesSwagger(res.body, '/api/stats');
  });

  it('returns 0 for quizzes nobody has passed', async () => {
    await seedQuiz();
    await seedQuiz({ title: 'History' });

    const res = await request(app).get('/api/stats');

    expect(res.body).toEqual({ passedCount: 0 });
  });

  it('sums passCount of all quizzes, of both age groups and of any owner', async () => {
    await seedQuiz({ ageGroup: 'adults', passCount: 5 });
    await seedQuiz({ title: 'Animals', ageGroup: 'children', passCount: 7 });
    await Quiz.create({ title: 'Other owner', owner: new mongoose.Types.ObjectId(), passCount: 3 });

    const res = await request(app).get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ passedCount: 15 });
    expectMatchesSwagger(res.body, '/api/stats');
  });

  it('works with a cookie as well as without one', async () => {
    await seedQuiz({ passCount: 2 });
    const { agent } = await signUp();

    const res = await agent.get('/api/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ passedCount: 2 });
  });

  it('grows after a pass is submitted to POST /api/quizzes/:id/stats', async () => {
    const quiz = await seedQuiz({ passCount: 1 });

    await request(app).post(`/api/quizzes/${quiz._id}/stats`).send({ total: 5, correct: 3 });
    await request(app).post(`/api/quizzes/${quiz._id}/stats`).send({ total: 5, correct: 1 });
    const res = await request(app).get('/api/stats');

    expect(res.body).toEqual({ passedCount: 3 });
  });
});

describe('GET /api/users/stats (private)', () => {
  it('returns 401 without a cookie and with an invalid cookie', async () => {
    const guest = await request(app).get('/api/users/stats');
    const invalid = await request(app).get('/api/users/stats').set('Cookie', 'token=not-a-jwt');

    expect(guest.status).toBe(401);
    expect(invalid.status).toBe(401);
    expectMatchesSwagger(guest.body, '/api/users/stats', '401');
    expectMatchesSwagger(invalid.body, '/api/users/stats', '401');
  });

  it('returns zeros for a user without results', async () => {
    const { agent } = await signUp();

    const res = await agent.get('/api/users/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ passedCount: 0, successRate: 0 });
    expectMatchesSwagger(res.body, '/api/users/stats');
  });

  it('counts passed quizzes and the percentage of successful ones', async () => {
    const { agent, id } = await signUp();
    const [a, b, c, d] = await Promise.all([
      seedQuiz({ title: 'Quiz A' }),
      seedQuiz({ title: 'Quiz B' }),
      seedQuiz({ title: 'Quiz C' }),
      seedQuiz({ title: 'Quiz D' })
    ]);
    await seedResult(id, a._id, 9, 10);
    await seedResult(id, b._id, 5, 10);
    await seedResult(id, c._id, 4, 10);
    await seedResult(id, d._id, 0, 10);

    const res = await agent.get('/api/users/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ passedCount: 4, successRate: 50 });
    expectMatchesSwagger(res.body, '/api/users/stats');
  });

  it('does not mix up statistics of different users', async () => {
    const first = await signUp('first@example.com');
    const second = await signUp('second@example.com');
    const quiz = await seedQuiz();
    await seedResult(first.id, quiz._id, 10, 10);

    const firstRes = await first.agent.get('/api/users/stats');
    const secondRes = await second.agent.get('/api/users/stats');

    expect(firstRes.body).toEqual({ passedCount: 1, successRate: 100 });
    expect(secondRes.body).toEqual({ passedCount: 0, successRate: 0 });
  });

  it('is filled in by passing a quiz through POST /api/quizzes/:id/stats', async () => {
    const { agent } = await signUp();
    const win = await seedQuiz({ title: 'Easy one' });
    const loss = await seedQuiz({ title: 'Hard one' });

    await agent.post(`/api/quizzes/${win._id}/stats`).send({ total: 10, correct: 8 });
    await agent.post(`/api/quizzes/${loss._id}/stats`).send({ total: 10, correct: 2 });
    const res = await agent.get('/api/users/stats');

    expect(res.body).toEqual({ passedCount: 2, successRate: 50 });
  });

  it('counts a repeated pass of the same quiz once and uses the best result', async () => {
    const { agent } = await signUp();
    const quiz = await seedQuiz();

    await agent.post(`/api/quizzes/${quiz._id}/stats`).send({ total: 10, correct: 2 });
    const before = await agent.get('/api/users/stats');
    await agent.post(`/api/quizzes/${quiz._id}/stats`).send({ total: 10, correct: 9 });
    const after = await agent.get('/api/users/stats');

    expect(before.body).toEqual({ passedCount: 1, successRate: 0 });
    expect(after.body).toEqual({ passedCount: 1, successRate: 100 });
  });

  it('drops a quiz from the statistics when it is deleted', async () => {
    const { agent, id } = await signUp();
    const mine = await agent.post('/api/quizzes').send({ quizTheme: 'To delete' });
    expect(mine.status).toBe(201);
    const quizId = mine.body.quiz._id;
    await seedResult(id, quizId, 10, 10);
    expect((await agent.get('/api/users/stats')).body).toEqual({ passedCount: 1, successRate: 100 });

    const del = await agent.delete(`/api/quizzes/${quizId}`);
    expect(del.status).toBe(200);

    expect((await agent.get('/api/users/stats')).body).toEqual({ passedCount: 0, successRate: 0 });
  });

  it('is not shadowed by other /api/users routes', async () => {
    const { agent } = await signUp();

    const stats = await agent.get('/api/users/stats');
    const current = await agent.get('/api/users/current');

    expect(stats.body).toHaveProperty('passedCount');
    expect(current.body).toHaveProperty('user');
  });
});
