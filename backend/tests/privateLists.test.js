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

function expectMatchesSwagger(body, route, status = '200') {
  const errors = collectErrors(body, responseSchema(swaggerSpec, route, 'get', status), swaggerSpec);
  expect(errors).toEqual([]);
}

let counter = 0;
async function seedQuiz(owner, { title, ageGroup = 'adults', category = 'History', rating = 0, passCount = 0 }) {
  counter += 1;
  const quiz = await Quiz.create({ title, owner, ageGroup, category, rating, passCount });
  await Quiz.updateOne(
    { _id: quiz._id },
    { $set: { createdAt: new Date(2026, 0, 1, 0, counter) } },
    { timestamps: false }
  );
  return quiz;
}

async function signUp(email) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name: 'Tester', email, password: 'password123' });
  expect(res.status).toBe(201);
  return { agent, id: res.body.user._id };
}

const titles = (res) => res.body.quizzes.map((quiz) => quiz.title);
const ids = (res) => res.body.quizzes.map((quiz) => quiz.id);

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

describe.each([
  ['/api/quizzes/own'],
  ['/api/quizzes/last-passed'],
  ['/api/users/favorites']
])('GET %s (private)', (route) => {
  it('returns 401 without a cookie and with an invalid cookie', async () => {
    const guest = await request(app).get(route);
    const invalid = await request(app).get(route).set('Cookie', 'token=not-a-jwt');

    expect(guest.status).toBe(401);
    expect(invalid.status).toBe(401);
    expectMatchesSwagger(guest.body, route, '401');
  });

  it('returns an empty list for a user with nothing to show', async () => {
    const { agent } = await signUp('empty@example.com');

    const res = await agent.get(route);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ quizzes: [], total: 0, hasMore: false });
    expectMatchesSwagger(res.body, route);
  });

  it('returns 400 for page below 1 and for limit outside 4-8', async () => {
    const { agent } = await signUp('invalid@example.com');

    const responses = await Promise.all([
      agent.get(`${route}?page=0`),
      agent.get(`${route}?limit=3`),
      agent.get(`${route}?limit=9`),
      agent.get(`${route}?page=abc`)
    ]);

    responses.forEach((res) => expect(res.status).toBe(400));
    expectMatchesSwagger(responses[0].body, route, '400');
  });
});

describe('GET /api/quizzes/own', () => {
  it('returns only the quizzes of the current user, never those of other users', async () => {
    const alice = await signUp('alice@example.com');
    const bob = await signUp('bob@example.com');
    await seedQuiz(alice.id, { title: 'Alice one' });
    await seedQuiz(bob.id, { title: 'Bob one' });
    await seedQuiz(alice.id, { title: 'Alice two' });
    await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Stranger' });

    const aliceRes = await alice.agent.get('/api/quizzes/own');
    const bobRes = await bob.agent.get('/api/quizzes/own');

    expect(titles(aliceRes)).toEqual(['Alice two', 'Alice one']);
    expect(aliceRes.body.total).toBe(2);
    expect(titles(bobRes)).toEqual(['Bob one']);
    expect(bobRes.body.total).toBe(1);
  });

  it('ignores an owner query parameter', async () => {
    const alice = await signUp('alice-owner@example.com');
    const bob = await signUp('bob-owner@example.com');
    await seedQuiz(alice.id, { title: 'Alice one' });
    await seedQuiz(bob.id, { title: 'Bob one' });

    const res = await alice.agent.get('/api/quizzes/own').query({ owner: bob.id });

    expect(res.status).toBe(200);
    expect(titles(res)).toEqual(['Alice one']);
  });

  it('is not captured by GET /api/quizzes/:id', async () => {
    const { agent } = await signUp('route@example.com');

    const res = await agent.get('/api/quizzes/own');

    expect(res.status).toBe(200);
  });

  it('returns the same fields as the filter, with isFavorite from the favorites', async () => {
    const { agent, id } = await signUp('fields@example.com');
    const first = await seedQuiz(id, { title: 'Roman history', category: 'History', rating: 4.5, passCount: 3 });
    await seedQuiz(id, { title: 'Space science', category: 'Science', rating: 2, passCount: 1 });
    await User.updateOne({ _id: id }, { $set: { favorites: [first._id] } });

    const res = await agent.get('/api/quizzes/own');

    expect(res.body.quizzes.map((quiz) => Object.keys(quiz).sort())).toEqual([
      ['category', 'id', 'isFavorite', 'passCount', 'rating', 'title'],
      ['category', 'id', 'isFavorite', 'passCount', 'rating', 'title']
    ]);
    expect(res.body.quizzes.map((quiz) => [quiz.title, quiz.isFavorite])).toEqual([
      ['Space science', false],
      ['Roman history', true]
    ]);
    expect(res.body.quizzes[1]).toMatchObject({ id: String(first._id), rating: 4.5, passCount: 3 });
    expectMatchesSwagger(res.body, '/api/quizzes/own');
  });

  it('paginates by 8, counts only own quizzes and never repeats an item', async () => {
    const { agent, id } = await signUp('pages@example.com');
    for (let i = 0; i < 19; i += 1) {
      await seedQuiz(id, { title: `Own ${i}` });
      await seedQuiz(new mongoose.Types.ObjectId(), { title: `Foreign ${i}` });
    }

    const first = await agent.get('/api/quizzes/own');
    const second = await agent.get('/api/quizzes/own?page=2');
    const last = await agent.get('/api/quizzes/own?page=3');
    const beyond = await agent.get('/api/quizzes/own?page=4');
    const small = await agent.get('/api/quizzes/own?limit=4');

    expect([first, second, last].map((res) => res.body.quizzes.length)).toEqual([8, 8, 3]);
    [first, second, last].forEach((res) => expect(res.body.total).toBe(19));
    expect([first, second, last].map((res) => res.body.hasMore)).toEqual([true, true, false]);
    expect(beyond.body).toEqual({ quizzes: [], total: 19, hasMore: false });
    expect(small.body.quizzes).toHaveLength(4);

    const all = [first, second, last].flatMap((res) => titles(res));
    expect(new Set(all).size).toBe(19);
    expect(all.every((title) => title.startsWith('Own '))).toBe(true);
  });
});

describe('GET /api/users/favorites', () => {
  it('returns the favorites, the most recently added first, with isFavorite true', async () => {
    const { agent, id } = await signUp('fav@example.com');
    const a = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Quiz A', rating: 4, passCount: 7 });
    const b = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Quiz B' });
    await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Not favorite' });
    const c = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Quiz C' });
    await User.updateOne({ _id: id }, { $set: { favorites: [a._id, c._id, b._id] } });

    const res = await agent.get('/api/users/favorites');

    expect(res.status).toBe(200);
    expect(titles(res)).toEqual(['Quiz B', 'Quiz C', 'Quiz A']);
    expect(res.body.total).toBe(3);
    expect(res.body.quizzes.every((quiz) => quiz.isFavorite === true)).toBe(true);
    expect(Object.keys(res.body.quizzes[2]).sort()).toEqual(
      ['category', 'id', 'isFavorite', 'passCount', 'rating', 'title']
    );
    expect(res.body.quizzes[2]).toMatchObject({ id: String(a._id), rating: 4, passCount: 7 });
    expectMatchesSwagger(res.body, '/api/users/favorites');
  });

  it('shows only the favorites of the current user', async () => {
    const alice = await signUp('alice-fav@example.com');
    const bob = await signUp('bob-fav@example.com');
    const one = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'For Alice' });
    const two = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'For Bob' });
    await User.updateOne({ _id: alice.id }, { $set: { favorites: [one._id] } });
    await User.updateOne({ _id: bob.id }, { $set: { favorites: [two._id] } });

    const res = await alice.agent.get('/api/users/favorites');

    expect(titles(res)).toEqual(['For Alice']);
  });

  it('skips quizzes that no longer exist, so total matches what the pages return', async () => {
    const { agent, id } = await signUp('gone@example.com');
    const alive = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Alive' });
    await User.updateOne(
      { _id: id },
      { $set: { favorites: [new mongoose.Types.ObjectId(), alive._id] } }
    );

    const res = await agent.get('/api/users/favorites');

    expect(titles(res)).toEqual(['Alive']);
    expect(res.body.total).toBe(1);
  });

  it('paginates by 8', async () => {
    const { agent, id } = await signUp('favpages@example.com');
    const favorites = [];
    for (let i = 0; i < 19; i += 1) {
      const quiz = await seedQuiz(new mongoose.Types.ObjectId(), { title: `Fav ${i}` });
      favorites.push(quiz._id);
    }
    await User.updateOne({ _id: id }, { $set: { favorites } });

    const first = await agent.get('/api/users/favorites');
    const second = await agent.get('/api/users/favorites?page=2');
    const last = await agent.get('/api/users/favorites?page=3');
    const beyond = await agent.get('/api/users/favorites?page=4');

    expect([first, second, last].map((res) => res.body.quizzes.length)).toEqual([8, 8, 3]);
    [first, second, last].forEach((res) => expect(res.body.total).toBe(19));
    expect([first, second, last].map((res) => res.body.hasMore)).toEqual([true, true, false]);
    expect(beyond.body).toEqual({ quizzes: [], total: 19, hasMore: false });
    expect(new Set([first, second, last].flatMap(ids)).size).toBe(19);
  });
});

describe('GET /api/quizzes/last-passed', () => {
  const result = (quiz, correctAnswers, minute, totalQuestions = 10) => ({
    quiz: quiz._id,
    correctAnswers,
    totalQuestions,
    date: new Date(2026, 5, 1, 12, minute)
  });

  it('gives every quiz a result, the last one, with the most recently passed quiz first', async () => {
    const { agent, id } = await signUp('passed@example.com');
    const a = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Quiz A', rating: 3, passCount: 4 });
    const b = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Quiz B' });
    const c = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Never passed' });
    await User.updateOne(
      { _id: id },
      {
        $set: {
          favorites: [b._id],
          // A пройдено двічі (останній — о 40-й хвилині), B — раз між ними. Порядок у масиві навмисно змішаний.
          results: [result(a, 4, 40), result(b, 9, 20), result(a, 2, 10)]
        }
      }
    );

    const res = await agent.get('/api/quizzes/last-passed');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.hasMore).toBe(false);
    expect(titles(res)).toEqual(['Quiz A', 'Quiz B']);
    expect(ids(res)).not.toContain(String(c._id));
    expect(res.body.quizzes.every((quiz) => quiz.lastResult && typeof quiz.lastResult === 'object')).toBe(true);
    expect(res.body.quizzes[0].lastResult).toMatchObject({ correctAnswers: 4, totalQuestions: 10 });
    expect(res.body.quizzes[0].lastResult.date).toBe(new Date(2026, 5, 1, 12, 40).toISOString());
    expect(res.body.quizzes[1].lastResult).toMatchObject({ correctAnswers: 9, totalQuestions: 10 });
    expect(res.body.quizzes.map((quiz) => quiz.isFavorite)).toEqual([false, true]);
    expect(res.body.quizzes[0]).toMatchObject({ id: String(a._id), rating: 3, passCount: 4 });
    expectMatchesSwagger(res.body, '/api/quizzes/last-passed');
  });

  it('shows only the results of the current user', async () => {
    const alice = await signUp('alice-passed@example.com');
    const bob = await signUp('bob-passed@example.com');
    const shared = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Shared' });
    const onlyBob = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Only Bob' });
    await User.updateOne({ _id: alice.id }, { $set: { results: [result(shared, 1, 1)] } });
    await User.updateOne({ _id: bob.id }, { $set: { results: [result(shared, 8, 2), result(onlyBob, 5, 3)] } });

    const res = await alice.agent.get('/api/quizzes/last-passed');

    expect(titles(res)).toEqual(['Shared']);
    expect(res.body.quizzes[0].lastResult.correctAnswers).toBe(1);
  });

  it('skips results of quizzes that no longer exist, so every item has a quiz and a result', async () => {
    const { agent, id } = await signUp('gone-passed@example.com');
    const alive = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Alive' });
    const deleted = await seedQuiz(new mongoose.Types.ObjectId(), { title: 'Deleted' });
    await User.updateOne(
      { _id: id },
      { $set: { results: [result(deleted, 5, 30), result(alive, 6, 10)] } }
    );
    await Quiz.deleteOne({ _id: deleted._id });

    const res = await agent.get('/api/quizzes/last-passed');

    expect(titles(res)).toEqual(['Alive']);
    expect(res.body.total).toBe(1);
  });

  it('paginates by 8 over distinct quizzes', async () => {
    const { agent, id } = await signUp('passedpages@example.com');
    const results = [];
    for (let i = 0; i < 19; i += 1) {
      const quiz = await seedQuiz(new mongoose.Types.ObjectId(), { title: `Passed ${i}` });
      // Кожен тест пройдено двічі: у total він рахується один раз.
      results.push(result(quiz, 1, i), result(quiz, 2, i + 30));
    }
    await User.updateOne({ _id: id }, { $set: { results } });

    const first = await agent.get('/api/quizzes/last-passed');
    const second = await agent.get('/api/quizzes/last-passed?page=2');
    const last = await agent.get('/api/quizzes/last-passed?page=3');
    const beyond = await agent.get('/api/quizzes/last-passed?page=4');

    expect([first, second, last].map((res) => res.body.quizzes.length)).toEqual([8, 8, 3]);
    [first, second, last].forEach((res) => expect(res.body.total).toBe(19));
    expect([first, second, last].map((res) => res.body.hasMore)).toEqual([true, true, false]);
    expect(beyond.body).toEqual({ quizzes: [], total: 19, hasMore: false });
    expect(new Set([first, second, last].flatMap(ids)).size).toBe(19);
    expect([first, second, last].every((res) => res.body.quizzes.every((quiz) => quiz.lastResult))).toBe(true);
    // Найсвіжіший (Passed 18, останній раз о 48-й хвилині) — першим, найдавніший — останнім.
    expect(first.body.quizzes[0].title).toBe('Passed 18');
    expect(last.body.quizzes[2].title).toBe('Passed 0');
  });
});
