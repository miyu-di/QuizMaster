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

function expectMatchesSwagger(body, status = '200') {
  const errors = collectErrors(body, responseSchema(swaggerSpec, '/api/quizzes/filter', 'get', status), swaggerSpec);
  expect(errors).toEqual([]);
}

let counter = 0;
async function seedQuiz({ title, ageGroup = 'adults', category = '', rating = 0, passCount = 0 }) {
  counter += 1;
  const quiz = await Quiz.create({ title, owner: ownerId, ageGroup, category, rating, passCount });
  await Quiz.updateOne(
    { _id: quiz._id },
    { $set: { createdAt: new Date(2026, 0, 1, 0, counter) } },
    { timestamps: false }
  );
  return quiz;
}

async function seedCatalog() {
  await seedQuiz({ title: 'Roman history', category: 'History', rating: 4.5, passCount: 30 });
  await seedQuiz({ title: 'World history', category: 'History', rating: 3, passCount: 20 });
  await seedQuiz({ title: 'Space science', category: 'Science', rating: 5, passCount: 10 });
  await seedQuiz({ title: 'Physics basics', category: 'Science', rating: 2, passCount: 5 });
  await seedQuiz({ title: 'Famous painters', category: 'Art', rating: 4, passCount: 1 });
  await seedQuiz({ title: 'Space for kids', ageGroup: 'children', category: 'Space', rating: 4.8, passCount: 40 });
  await seedQuiz({ title: 'Kids music', ageGroup: 'children', category: 'Music', rating: 3.5, passCount: 2 });
  await seedQuiz({ title: 'Rock music', ageGroup: 'adults', category: 'Music', rating: 4.2, passCount: 8 });
}

const titles = (res) => res.body.quizzes.map((q) => q.title);

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  counter = 0;
  await Promise.all([Quiz.deleteMany({}), User.deleteMany({})]);
});

describe('GET /api/quizzes/filter', () => {
  it('is public, searches all categories without filters and returns the documented fields', async () => {
    await seedCatalog();

    const res = await request(app).get('/api/quizzes/filter');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(8);
    expect(res.body.quizzes).toHaveLength(8);
    expect(res.body.hasMore).toBe(false);
    expect(Object.keys(res.body.quizzes[0]).sort()).toEqual(
      ['category', 'id', 'isFavorite', 'passCount', 'rating', 'title'].sort()
    );
    expect(res.body.quizzes[0]).toMatchObject({ title: 'Space for kids', passCount: 40, isFavorite: false });
    expectMatchesSwagger(res.body);
  });

  it('is not captured by GET /api/quizzes/:id', async () => {
    const res = await request(app).get('/api/quizzes/filter');

    expect(res.status).toBe(200);
  });

  it('filters by one category', async () => {
    await seedCatalog();

    const res = await request(app).get('/api/quizzes/filter?categories=History');

    expect(titles(res)).toEqual(['Roman history', 'World history']);
    expect(res.body.total).toBe(2);
  });

  it('accepts several categories as a repeated parameter and as a comma-separated list', async () => {
    await seedCatalog();

    const repeated = await request(app).get('/api/quizzes/filter?categories=History&categories=Art');
    const commas = await request(app).get('/api/quizzes/filter?categories=History,Art');

    expect(titles(repeated)).toEqual(['Roman history', 'World history', 'Famous painters']);
    expect(titles(commas)).toEqual(titles(repeated));
    expect(repeated.body.total).toBe(3);
  });

  it('supports categories with special characters', async () => {
    await seedQuiz({ title: 'Cinema quiz', category: 'Movies & TV' });
    await seedQuiz({ title: 'Cooking quiz', category: 'Food & Drink' });

    const res = await request(app).get(`/api/quizzes/filter?categories=${encodeURIComponent('Movies & TV')}`);

    expect(titles(res)).toEqual(['Cinema quiz']);
  });

  it('treats an empty categories parameter as no category filter', async () => {
    await seedCatalog();

    const res = await request(app).get('/api/quizzes/filter?categories=');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(8);
  });

  it('filters by ageGroup, and the same category is split by age group', async () => {
    await seedCatalog();

    const children = await request(app).get('/api/quizzes/filter?ageGroup=children');
    const music = await request(app).get('/api/quizzes/filter?categories=Music&ageGroup=adults');

    expect(titles(children)).toEqual(['Space for kids', 'Kids music']);
    expect(titles(music)).toEqual(['Rock music']);
  });

  it('rating is a minimum (rating >= value)', async () => {
    await seedCatalog();

    const res = await request(app).get('/api/quizzes/filter?rating=4.5');

    expect(titles(res)).toEqual(['Space for kids', 'Roman history', 'Space science']);
    expect(res.body.total).toBe(3);
  });

  it('searches by title, case-insensitively and by substring', async () => {
    await seedCatalog();

    const res = await request(app).get('/api/quizzes/filter?search=SPACE');

    expect(titles(res)).toEqual(['Space for kids', 'Space science']);
  });

  it('does not treat the search string as a regular expression', async () => {
    await seedQuiz({ title: 'C++ basics', category: 'Technology' });
    await seedQuiz({ title: 'Cooking', category: 'Food & Drink' });

    const special = await request(app).get('/api/quizzes/filter').query({ search: 'C++' });
    const wildcard = await request(app).get('/api/quizzes/filter').query({ search: '.*' });

    expect(titles(special)).toEqual(['C++ basics']);
    expect(wildcard.body.total).toBe(0);
  });

  it('combines all filters with AND', async () => {
    await seedCatalog();

    const res = await request(app).get(
      '/api/quizzes/filter?categories=History&categories=Science&ageGroup=adults&rating=3&search=history'
    );

    expect(titles(res)).toEqual(['Roman history', 'World history']);
    expect(res.body.total).toBe(2);

    const none = await request(app).get('/api/quizzes/filter?categories=Science&rating=5&search=physics');
    expect(none.body.total).toBe(0);
  });

  it('returns an empty array and total 0 when nothing matches', async () => {
    await seedCatalog();

    const res = await request(app).get('/api/quizzes/filter?categories=Art&ageGroup=children');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ quizzes: [], total: 0, hasMore: false });
    expectMatchesSwagger(res.body);
  });

  it('returns an empty array and total 0 on an empty database', async () => {
    const res = await request(app).get('/api/quizzes/filter');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ quizzes: [], total: 0, hasMore: false });
  });

  it('paginates by 8 by default, total counts all matches and hasMore follows the page', async () => {
    for (let i = 0; i < 19; i += 1) {
      await seedQuiz({ title: `History ${i}`, category: 'History', passCount: i });
    }

    const first = await request(app).get('/api/quizzes/filter?categories=History');
    const second = await request(app).get('/api/quizzes/filter?categories=History&page=2');
    const last = await request(app).get('/api/quizzes/filter?categories=History&page=3');
    const beyond = await request(app).get('/api/quizzes/filter?categories=History&page=4');

    expect(first.body.quizzes).toHaveLength(8);
    expect(second.body.quizzes).toHaveLength(8);
    expect(last.body.quizzes).toHaveLength(3);
    [first, second, last].forEach((res) => expect(res.body.total).toBe(19));
    expect([first, second, last].map((res) => res.body.hasMore)).toEqual([true, true, false]);
    expect(first.body.quizzes[0].passCount).toBe(18);
    expect(last.body.quizzes[2].passCount).toBe(0);
    expect(beyond.body).toEqual({ quizzes: [], total: 19, hasMore: false });

    const ids = [first, second, last].flatMap((res) => res.body.quizzes.map((q) => q.id));
    expect(new Set(ids).size).toBe(19);
  });

  it('respects limit and rejects values outside 4-8', async () => {
    await seedCatalog();

    const limited = await request(app).get('/api/quizzes/filter?limit=4');
    const tooBig = await request(app).get('/api/quizzes/filter?limit=9');
    const tooSmall = await request(app).get('/api/quizzes/filter?limit=3');

    expect(limited.body.quizzes).toHaveLength(4);
    expect(limited.body.total).toBe(8);
    expect(limited.body.hasMore).toBe(true);
    expect(tooBig.status).toBe(400);
    expect(tooSmall.status).toBe(400);
  });

  it('returns 400 for invalid parameters', async () => {
    const responses = await Promise.all([
      request(app).get('/api/quizzes/filter?categories=Nope'),
      request(app).get('/api/quizzes/filter?categories=History,Nope'),
      request(app).get('/api/quizzes/filter?ageGroup=teens'),
      request(app).get('/api/quizzes/filter?rating=6'),
      request(app).get('/api/quizzes/filter?rating=abc'),
      request(app).get('/api/quizzes/filter?page=0')
    ]);

    responses.forEach((res) => expect(res.status).toBe(400));
    expectMatchesSwagger(responses[0].body, '400');
  });

  describe('isFavorite', () => {
    async function signUp() {
      const agent = request.agent(app);
      const res = await agent
        .post('/api/auth/register')
        .send({ name: 'Fav', email: 'fav-filter@example.com', password: 'password123' });
      expect(res.status).toBe(201);
      return { agent, id: res.body.user._id };
    }

    it('marks the favorites of an authenticated user', async () => {
      const roman = await seedQuiz({ title: 'Roman history', category: 'History', passCount: 3 });
      await seedQuiz({ title: 'World history', category: 'History', passCount: 2 });
      const { agent, id } = await signUp();
      await User.updateOne({ _id: id }, { $set: { favorites: [roman._id] } });

      const res = await agent.get('/api/quizzes/filter?categories=History');

      expect(res.body.quizzes.map((q) => [q.title, q.isFavorite])).toEqual([
        ['Roman history', true],
        ['World history', false]
      ]);
      expectMatchesSwagger(res.body);
    });

    it('treats an invalid cookie as a guest (isFavorite=false, no error)', async () => {
      await seedQuiz({ title: 'Roman history', category: 'History' });

      const res = await request(app).get('/api/quizzes/filter').set('Cookie', 'token=not-a-jwt');

      expect(res.status).toBe(200);
      expect(res.body.quizzes.every((q) => q.isFavorite === false)).toBe(true);
    });
  });
});
