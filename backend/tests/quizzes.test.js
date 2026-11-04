process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:5173';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const Quiz = require('../src/models/Quiz');
const Question = require('../src/models/Question');
const User = require('../src/models/User');

let mongod;
let owner; 
let stranger; 
let strangerId;

async function signUp(name, email) {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/auth/register')
    .send({ name, email, password: 'password123' });
  expect(res.status).toBe(201);
  return { agent, id: res.body.user._id };
}

async function createQuiz(agent, quizTheme = 'Space trivia') {
  const res = await agent.post('/api/quizzes').send({ quizTheme });
  expect(res.status).toBe(201);
  return res.body.quiz;
}

function addQuestions(quizId, count = 2) {
  return Question.insertMany(
    Array.from({ length: count }, (_, i) => ({
      quiz: quizId,
      type: 'single-choice',
      time: 30,
      description: `Question number ${i + 1}`,
      answers: [
        { id: 'a', text: 'a' },
        { id: 'b', text: 'b' }
      ],
      validAnswer: 'a'
    }))
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
  await Promise.all([Quiz.deleteMany({}), Question.deleteMany({}), User.deleteMany({})]);
  owner = (await signUp('Owner', 'owner@example.com')).agent;
  const second = await signUp('Stranger', 'stranger@example.com');
  stranger = second.agent;
  strangerId = second.id;
});

describe('GET /api/quizzes/categories', () => {
  it('is public and returns lists for adults and children', async () => {
    const res = await request(app).get('/api/quizzes/categories');

    expect(res.status).toBe(200);
    expect(res.body.adults.length).toBeGreaterThan(0);
    expect(res.body.children.length).toBeGreaterThan(0);
  });
});

describe('POST /api/quizzes', () => {
  it('requires authentication', async () => {
    const res = await request(app).post('/api/quizzes').send({ quizTheme: 'Space trivia' });
    expect(res.status).toBe(401);
  });

  it('creates a quiz with default ageGroup, empty background and category list', async () => {
    const res = await owner.post('/api/quizzes').send({ quizTheme: '  Space trivia  ' });

    expect(res.status).toBe(201);
    expect(res.body.quiz).toMatchObject({
      title: 'Space trivia',
      ageGroup: 'adults',
      background: '',
      category: ''
    });
    expect(res.body.categories.length).toBeGreaterThan(0);
    expect(await Quiz.countDocuments({ _id: res.body.quiz._id })).toBe(1);
  });

  it.each([['ab'], ['x'.repeat(33)], ['']])('rejects quizTheme %j', async (quizTheme) => {
    const res = await owner.post('/api/quizzes').send({ quizTheme });
    expect(res.status).toBe(400);
  });

  it('rejects a missing quizTheme', async () => {
    const res = await owner.post('/api/quizzes').send({});
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/quizzes/:id', () => {
  it('lets the owner change title, ageGroup, category and background', async () => {
    const quiz = await createQuiz(owner);

    const res = await owner.patch(`/api/quizzes/${quiz._id}`).send({
      quizTheme: 'Kids space',
      quizAgeGroup: 'children',
      quizCategory: 'Space',
      quizBackground: 'bg-2'
    });

    expect(res.status).toBe(200);
    expect(res.body.quiz).toMatchObject({
      title: 'Kids space',
      ageGroup: 'children',
      category: 'Space',
      background: 'bg-2'
    });
  });

  it('allows clearing the background with an empty string', async () => {
    const quiz = await createQuiz(owner);
    await owner.patch(`/api/quizzes/${quiz._id}`).send({ quizBackground: 'bg-1' });

    const res = await owner.patch(`/api/quizzes/${quiz._id}`).send({ quizBackground: '' });

    expect(res.status).toBe(200);
    expect(res.body.quiz.background).toBe('');
  });

  it("returns 403 and changes nothing for someone else's quiz", async () => {
    const quiz = await createQuiz(owner);

    const res = await stranger
      .patch(`/api/quizzes/${quiz._id}`)
      .send({ quizTheme: 'Hijacked', quizBackground: 'bg-3' });

    expect(res.status).toBe(403);
    const inDb = await Quiz.findById(quiz._id);
    expect(inDb.title).toBe('Space trivia');
    expect(inDb.background).toBe('');
  });

  it('requires authentication', async () => {
    const quiz = await createQuiz(owner);
    const res = await request(app).patch(`/api/quizzes/${quiz._id}`).send({ quizTheme: 'Nope nope' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown ageGroup, short title and unknown background', async () => {
    const quiz = await createQuiz(owner);

    for (const body of [
      { quizAgeGroup: 'teens' },
      { quizTheme: 'ab' },
      { quizBackground: 'does-not-exist' }
    ]) {
      const res = await owner.patch(`/api/quizzes/${quiz._id}`).send(body);
      expect(res.status).toBe(400);
    }
  });

  it('rejects an empty body', async () => {
    const quiz = await createQuiz(owner);
    const res = await owner.patch(`/api/quizzes/${quiz._id}`).send({});
    expect(res.status).toBe(400);
  });

  it('rejects a category that does not belong to the age group', async () => {
    const quiz = await createQuiz(owner); // adults

    const res = await owner.patch(`/api/quizzes/${quiz._id}`).send({ quizCategory: 'Fairy tales' });

    expect(res.status).toBe(400);
    expect((await Quiz.findById(quiz._id)).category).toBe('');
  });

  it('resets the category when the age group changes and the old one no longer fits', async () => {
    const quiz = await createQuiz(owner);
    await owner.patch(`/api/quizzes/${quiz._id}`).send({ quizCategory: 'History' });

    const res = await owner.patch(`/api/quizzes/${quiz._id}`).send({ quizAgeGroup: 'children' });

    expect(res.status).toBe(200);
    expect(res.body.quiz.ageGroup).toBe('children');
    expect(res.body.quiz.category).toBe('');
  });

  it('returns 404 for a missing quiz and 400 for a malformed id', async () => {
    const missing = new mongoose.Types.ObjectId();

    expect((await owner.patch(`/api/quizzes/${missing}`).send({ quizTheme: 'Whatever' })).status).toBe(404);
    expect((await owner.patch('/api/quizzes/not-an-id').send({ quizTheme: 'Whatever' })).status).toBe(400);
  });
});

describe('DELETE /api/quizzes/:id', () => {
  it("returns 403 and keeps the quiz and its questions for someone else's quiz", async () => {
    const quiz = await createQuiz(owner);
    await addQuestions(quiz._id, 3);

    const res = await stranger.delete(`/api/quizzes/${quiz._id}`);

    expect(res.status).toBe(403);
    expect(await Quiz.countDocuments({ _id: quiz._id })).toBe(1);
    expect(await Question.countDocuments({ quiz: quiz._id })).toBe(3);
  });

  it('requires authentication', async () => {
    const quiz = await createQuiz(owner);
    const res = await request(app).delete(`/api/quizzes/${quiz._id}`);

    expect(res.status).toBe(401);
    expect(await Quiz.countDocuments({ _id: quiz._id })).toBe(1);
  });

  it('removes the quiz and all its questions, leaving other quizzes untouched', async () => {
    const quiz = await createQuiz(owner, 'To be deleted');
    const other = await createQuiz(owner, 'Stays alive');
    await addQuestions(quiz._id, 3);
    await addQuestions(other._id, 2);

    const res = await owner.delete(`/api/quizzes/${quiz._id}`);

    expect(res.status).toBe(200);
    expect(await Quiz.countDocuments({ _id: quiz._id })).toBe(0);
    expect(await Question.countDocuments({ quiz: quiz._id })).toBe(0);
    expect(await Quiz.countDocuments({ _id: other._id })).toBe(1);
    expect(await Question.countDocuments({ quiz: other._id })).toBe(2);
  });

  it('removes the quiz from users favorites and results', async () => {
    const quiz = await createQuiz(owner);
    await User.updateOne(
      { _id: strangerId },
      {
        $push: {
          favorites: quiz._id,
          results: { quiz: quiz._id, correctAnswers: 1, totalQuestions: 2 }
        }
      }
    );

    await owner.delete(`/api/quizzes/${quiz._id}`);

    const user = await User.findById(strangerId);
    expect(user.favorites).toHaveLength(0);
    expect(user.results).toHaveLength(0);
  });

  it('returns 404 for a missing quiz and 400 for a malformed id', async () => {
    const missing = new mongoose.Types.ObjectId();

    expect((await owner.delete(`/api/quizzes/${missing}`)).status).toBe(404);
    expect((await owner.delete('/api/quizzes/not-an-id')).status).toBe(400);
  });
});
