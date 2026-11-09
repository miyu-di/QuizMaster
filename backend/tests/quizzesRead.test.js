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
const User = require('../src/models/User');
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
  await Promise.all([Quiz.deleteMany({}), Question.deleteMany({}), User.deleteMany({})]);
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

  it('hasMore is true while there are more portions and false on the last one', async () => {
    await seedCollections();

    const pages = [];
    for (const page of [1, 2, 3]) {
      const res = await request(app).get(`/api/quizzes?type=adults&limit=4&page=${page}`);
      expect(res.status).toBe(200);
      pages.push(res.body);
    }

    expect(pages.map((body) => body.adults.hasMore)).toEqual([true, true, false]);
    expect(pages.map((body) => body.hasMore)).toEqual([true, true, false]);
    expect(pages.every((body) => body.adults.total === 10)).toBe(true);
    expectMatchesSwagger(pages[2], '/api/quizzes', 'get', '200');
  });

  it('hasMore is false when the last portion is exactly full and for a page past the end', async () => {
    for (let i = 0; i < 8; i += 1) {
      await seedQuiz({ title: `Exact quiz ${i}`, ageGroup: 'adults', index: i });
    }

    const last = await request(app).get('/api/quizzes?type=adults&limit=4&page=2');
    const beyond = await request(app).get('/api/quizzes?type=adults&limit=4&page=3');

    expect(last.body.adults.quizzes).toHaveLength(4);
    expect(last.body.adults.hasMore).toBe(false);
    expect(beyond.status).toBe(200);
    expect(beyond.body.adults.quizzes).toEqual([]);
    expect(beyond.body.adults.hasMore).toBe(false);
  });

  it('type=both: hasMore is per collection, the top-level one is true while any collection has more', async () => {
    await seedCollections();

    const res = await request(app).get('/api/quizzes?type=both&limit=4&page=2');

    expect(res.body.adults.quizzes).toHaveLength(4);
    expect(res.body.adults.hasMore).toBe(true);
    expect(res.body.children.quizzes).toHaveLength(2);
    expect(res.body.children.hasMore).toBe(false);
    expect(res.body.hasMore).toBe(true);
  });

  it('limit=9 returns 400 and a missing limit defaults to 4', async () => {
    await seedCollections();

    const tooBig = await request(app).get('/api/quizzes?limit=9');
    const byDefault = await request(app).get('/api/quizzes?type=adults');

    expect(tooBig.status).toBe(400);
    expect(byDefault.body.adults.quizzes).toHaveLength(4);
  });

  it('serializes quiz _id and createdAt as strings', async () => {
    const quiz = await seedQuiz({ title: 'Strings quiz', ageGroup: 'adults', index: 5 });

    const res = await request(app).get('/api/quizzes?type=adults');
    const [item] = res.body.adults.quizzes;

    expect(typeof item._id).toBe('string');
    expect(item._id).toBe(String(quiz._id));
    expect(typeof item.createdAt).toBe('string');
    expect(item.createdAt).toBe(new Date(2026, 0, 1, 0, 5).toISOString());
  });

  it('returns empty collections with zero totals when nothing exists', async () => {
    const res = await request(app).get('/api/quizzes');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      adults: { quizzes: [], total: 0, hasMore: false },
      children: { quizzes: [], total: 0, hasMore: false },
      total: 0,
      hasMore: false
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

describe('GET /api/quizzes: isFavorite and optional authentication', () => {
  async function signUp(email = 'fav@example.com') {
    const agent = request.agent(app);
    const res = await agent.post('/api/auth/register').send({ name: 'Fav', email, password: 'password123' });
    expect(res.status).toBe(201);
    return { agent, id: res.body.user._id };
  }

  it('does not add isFavorite for a guest', async () => {
    await seedCollections();

    const res = await request(app).get('/api/quizzes');

    expect(res.status).toBe(200);
    const all = [...res.body.adults.quizzes, ...res.body.children.quizzes];
    expect(all.every((q) => !('isFavorite' in q))).toBe(true);
  });

  it('adds isFavorite to every quiz for an authenticated user', async () => {
    await seedCollections();
    const { agent, id } = await signUp();
    const top = await Quiz.findOne({ title: 'Adults quiz 9' });
    const kid = await Quiz.findOne({ title: 'Kids quiz 5' });
    await User.updateOne({ _id: id }, { $set: { favorites: [top._id, kid._id] } });

    const res = await agent.get('/api/quizzes?type=both&limit=4');

    expect(res.status).toBe(200);
    const all = [...res.body.adults.quizzes, ...res.body.children.quizzes];
    expect(all.every((q) => typeof q.isFavorite === 'boolean')).toBe(true);
    expect(res.body.adults.quizzes.find((q) => q._id === String(top._id)).isFavorite).toBe(true);
    expect(res.body.adults.quizzes.filter((q) => q.isFavorite)).toHaveLength(1);
    expect(res.body.children.quizzes.find((q) => q._id === String(kid._id)).isFavorite).toBe(true);
    expect(res.body.children.quizzes.filter((q) => q.isFavorite)).toHaveLength(1);
    expectMatchesSwagger(res.body, '/api/quizzes', 'get', '200');
  });

  it('marks a favorite on any page, not only on the first one', async () => {
    await seedCollections();
    const { agent, id } = await signUp();
    const oldest = await Quiz.findOne({ title: 'Adults quiz 0' });
    await User.updateOne({ _id: id }, { $set: { favorites: [oldest._id] } });

    const res = await agent.get('/api/quizzes?type=adults&limit=4&page=3');

    expect(res.body.adults.quizzes.map((q) => [q.title, q.isFavorite])).toEqual([
      ['Adults quiz 1', false],
      ['Adults quiz 0', true]
    ]);
    expect(res.body.adults.hasMore).toBe(false);
  });

  it('gives isFavorite=false everywhere when the user has no favorites', async () => {
    await seedCollections();
    const { agent } = await signUp();

    const res = await agent.get('/api/quizzes?type=adults');

    expect(res.body.adults.quizzes.every((q) => q.isFavorite === false)).toBe(true);
  });

  it('treats an invalid cookie as a guest instead of failing', async () => {
    await seedCollections();

    const res = await request(app).get('/api/quizzes?type=adults').set('Cookie', 'token=not-a-jwt');

    expect(res.status).toBe(200);
    expect(res.body.adults.quizzes.every((q) => !('isFavorite' in q))).toBe(true);
  });

  it('treats a cookie of a deleted user as a guest instead of failing', async () => {
    await seedCollections();
    const { agent, id } = await signUp();
    await User.deleteOne({ _id: id });

    const res = await agent.get('/api/quizzes?type=adults');

    expect(res.status).toBe(200);
    expect(res.body.adults.quizzes.every((q) => !('isFavorite' in q))).toBe(true);
  });

  it('still validates the query for an authenticated user', async () => {
    const { agent } = await signUp();

    const res = await agent.get('/api/quizzes?limit=9');

    expect(res.status).toBe(400);
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
