process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:5173';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const swaggerSpec = require('../src/config/swagger');
const Quiz = require('../src/models/Quiz');
const Question = require('../src/models/Question');
const { collectErrors, responseSchema } = require('./helpers/matchesSchema');

let mongod;
const ownerId = new mongoose.Types.ObjectId();

function expectMatchesSwagger(body, route, method, status) {
  const errors = collectErrors(body, responseSchema(swaggerSpec, route, method, status), swaggerSpec);
  expect(errors).toEqual([]);
}

async function seedQuiz({ title, ageGroup, passCount = 0, index = 0, ...rest }) {
  const quiz = await Quiz.create({ title, owner: ownerId, ageGroup, passCount, ...rest });
  await Quiz.updateOne(
    { _id: quiz._id },
    { $set: { createdAt: new Date(2026, 0, 1, 0, index) } },
    { timestamps: false }
  );
  return quiz;
}

async function seedCollections() {
  for (let i = 0; i < 10; i += 1) {
    await seedQuiz({ title: `Adults quiz ${i}`, ageGroup: 'adults', passCount: i, index: i });
  }
  for (let i = 0; i < 6; i += 1) {
    await seedQuiz({ title: `Kids quiz ${i}`, ageGroup: 'children', passCount: i, index: 100 + i });
  }
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
  await Promise.all([Quiz.deleteMany({}), Question.deleteMany({})]);
});

describe('GET /api/quizzes', () => {
  it('is public and by default returns both collections with 4 items, most popular first', async () => {
    await seedCollections();

    const res = await request(app).get('/api/quizzes');

    expect(res.status).toBe(200);
    expect(res.body.adults.quizzes.map((q) => q.passCount)).toEqual([9, 8, 7, 6]);
    expect(res.body.children.quizzes.map((q) => q.passCount)).toEqual([5, 4, 3, 2]);
    expect(res.body.adults.total).toBe(10);
    expect(res.body.children.total).toBe(6);
    expect(res.body.total).toBe(16);
    expectMatchesSwagger(res.body, '/api/quizzes', 'get', '200');
  });

  it('type=adults returns only the adults collection', async () => {
    await seedCollections();

    const res = await request(app).get('/api/quizzes?type=adults&limit=5');

    expect(res.status).toBe(200);
    expect(res.body.children).toBeUndefined();
    expect(res.body.adults.quizzes).toHaveLength(5);
    expect(res.body.adults.quizzes.every((q) => q.ageGroup === 'adults')).toBe(true);
    expect(res.body.total).toBe(10);
    expectMatchesSwagger(res.body, '/api/quizzes', 'get', '200');
  });

  it('type=children returns only the children collection', async () => {
    await seedCollections();

    const res = await request(app).get('/api/quizzes?type=children');

    expect(res.status).toBe(200);
    expect(res.body.adults).toBeUndefined();
    expect(res.body.children.quizzes.every((q) => q.ageGroup === 'children')).toBe(true);
    expect(res.body.total).toBe(6);
  });

  it('type=both applies limit to each collection', async () => {
    await seedCollections();

    const res = await request(app).get('/api/quizzes?type=both&limit=8');

    expect(res.body.adults.quizzes).toHaveLength(8);
    expect(res.body.children.quizzes).toHaveLength(6);
    expect(res.body.total).toBe(16);
  });

  it('sort=latest orders by creation date, newest first', async () => {
    await seedCollections();

    const res = await request(app).get('/api/quizzes?type=adults&sort=latest&limit=4');

    expect(res.body.adults.quizzes.map((q) => q.title)).toEqual([
      'Adults quiz 9',
      'Adults quiz 8',
      'Adults quiz 7',
      'Adults quiz 6'
    ]);
  });

  it('sort=popular is the default and ties are broken by newest first', async () => {
    await seedQuiz({ title: 'Old', ageGroup: 'adults', passCount: 5, index: 1 });
    await seedQuiz({ title: 'New', ageGroup: 'adults', passCount: 5, index: 2 });
    await seedQuiz({ title: 'Top', ageGroup: 'adults', passCount: 9, index: 0 });

    const res = await request(app).get('/api/quizzes?type=adults');

    expect(res.body.adults.quizzes.map((q) => q.title)).toEqual(['Top', 'New', 'Old']);
  });

  it('page returns the next portion without overlap', async () => {
    await seedCollections();

    const first = await request(app).get('/api/quizzes?type=adults&limit=4&page=1');
    const second = await request(app).get('/api/quizzes?type=adults&limit=4&page=2');
    const third = await request(app).get('/api/quizzes?type=adults&limit=4&page=3');

    const ids = [...first.body.adults.quizzes, ...second.body.adults.quizzes, ...third.body.adults.quizzes].map(
      (q) => q._id
    );
    expect(ids).toHaveLength(10);
    expect(new Set(ids).size).toBe(10);
    expect(third.body.adults.quizzes).toHaveLength(2);
  });

  it('returns empty collections with zero totals when nothing exists', async () => {
    const res = await request(app).get('/api/quizzes');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      adults: { quizzes: [], total: 0 },
      children: { quizzes: [], total: 0 },
      total: 0
    });
  });

  it.each([['4'], ['8']])('accepts boundary limit=%s', async (limit) => {
    await seedCollections();

    const res = await request(app).get(`/api/quizzes?type=adults&limit=${limit}`);

    expect(res.status).toBe(200);
    expect(res.body.adults.quizzes).toHaveLength(Number(limit));
  });

  it.each([['3'], ['9'], ['0'], ['-1'], ['100'], ['abc'], ['5.5'], ['']])(
    'rejects limit=%j with 400',
    async (limit) => {
      const res = await request(app).get(`/api/quizzes?limit=${encodeURIComponent(limit)}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/limit/);
      expectMatchesSwagger(res.body, '/api/quizzes', 'get', '400');
    }
  );

  it('rejects an unknown type, sort and a non-positive page', async () => {
    for (const query of ['type=teens', 'sort=random', 'page=0', 'page=abc']) {
      const res = await request(app).get(`/api/quizzes?${query}`);
      expect(res.status).toBe(400);
    }
  });

  it('is still reachable at /api/quizzes/categories (not swallowed by /:id)', async () => {
    const res = await request(app).get('/api/quizzes/categories');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.adults)).toBe(true);
  });
});

describe('GET /api/quizzes/:id', () => {
  it('is public and returns title, category, background and questions in creation order', async () => {
    const quiz = await seedQuiz({
      title: 'Geography',
      ageGroup: 'adults',
      category: 'Geography',
      background: 'bg-2'
    });
    await Question.create({
      quiz: quiz._id,
      type: 'single-choice',
      time: 30,
      description: 'Capital of France?',
      answers: [
        { id: 'a', text: 'Paris' },
        { id: 'b', text: 'Rome' },
        { id: 'c', text: 'Berlin' }
      ],
      validAnswer: 'a'
    });
    await Question.create({
      quiz: quiz._id,
      type: 'true-false',
      time: 15,
      description: 'The Earth is flat.',
      answers: [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' }
      ],
      validAnswer: 'false'
    });

    const res = await request(app).get(`/api/quizzes/${quiz._id}`);

    expect(res.status).toBe(200);
    expect(res.body.quiz).toMatchObject({
      _id: String(quiz._id),
      title: 'Geography',
      category: 'Geography',
      background: 'bg-2'
    });
    expect(res.body.quiz.questions).toHaveLength(2);
    expect(res.body.quiz.questions[0]).toMatchObject({
      description: 'Capital of France?',
      answers: [
        { id: 'a', text: 'Paris' },
        { id: 'b', text: 'Rome' },
        { id: 'c', text: 'Berlin' }
      ],
      validAnswer: 'a',
      time: 30
    });
    expect(res.body.quiz.questions[1].description).toBe('The Earth is flat.');
    expectMatchesSwagger(res.body, '/api/quizzes/{id}', 'get', '200');
  });

  it('returns an empty questions array for a quiz without questions', async () => {
    const quiz = await seedQuiz({ title: 'Empty one', ageGroup: 'children' });

    const res = await request(app).get(`/api/quizzes/${quiz._id}`);

    expect(res.status).toBe(200);
    expect(res.body.quiz.questions).toEqual([]);
  });

  it('does not leak questions of other quizzes', async () => {
    const quiz = await seedQuiz({ title: 'Mine quiz', ageGroup: 'adults' });
    const other = await seedQuiz({ title: 'Other quiz', ageGroup: 'adults' });
    await Question.create({
      quiz: other._id,
      type: 'single-choice',
      time: 10,
      description: 'Belongs to another quiz',
      answers: [
        { id: 'x', text: 'x' },
        { id: 'y', text: 'y' }
      ],
      validAnswer: 'x'
    });

    const res = await request(app).get(`/api/quizzes/${quiz._id}`);

    expect(res.body.quiz.questions).toEqual([]);
  });

  it('returns 404 for a missing quiz and 400 for a malformed id', async () => {
    const missing = await request(app).get(`/api/quizzes/${new mongoose.Types.ObjectId()}`);
    const malformed = await request(app).get('/api/quizzes/not-an-id');

    expect(missing.status).toBe(404);
    expectMatchesSwagger(missing.body, '/api/quizzes/{id}', 'get', '404');
    expect(malformed.status).toBe(400);
    expectMatchesSwagger(malformed.body, '/api/quizzes/{id}', 'get', '400');
  });
});
