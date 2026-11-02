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
let owner;
let stranger;
let quiz;

async function signUp(name, email) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name, email, password: 'password123' });
  expect(res.status).toBe(201);
  return agent;
}

function validQuestion(overrides = {}) {
  return {
    type: 'single-choice',
    time: 30,
    description: 'What is the capital of France?',
    answers: [
      { id: 'a', text: 'Paris' },
      { id: 'b', text: 'Rome' },
      { id: 'c', text: 'Berlin' }
    ],
    validAnswer: 'a',
    ...overrides
  };
}

async function createQuestion(body = validQuestion()) {
  const res = await owner.post(`/api/quizzes/${quiz._id}/questions`).send(body);
  expect(res.status).toBe(201);
  return res.body.question;
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
  owner = await signUp('Owner', 'owner@example.com');
  stranger = await signUp('Stranger', 'stranger@example.com');
  quiz = (await owner.post('/api/quizzes').send({ quizTheme: 'Geography' })).body.quiz;
});

describe('POST /api/quizzes/:quizId/questions', () => {
  it('creates a question linked to the quiz and matches the Swagger schema', async () => {
    const res = await owner.post(`/api/quizzes/${quiz._id}/questions`).send(validQuestion());

    expect(res.status).toBe(201);
    expect(res.body.question).toMatchObject({
      quiz: quiz._id,
      type: 'single-choice',
      time: 30,
      description: 'What is the capital of France?',
      validAnswer: 'a'
    });
    expect(res.body.question.answers).toHaveLength(3);
    expect(await Question.countDocuments({ quiz: quiz._id })).toBe(1);

    const errors = collectErrors(
      res.body,
      responseSchema(swaggerSpec, '/api/quizzes/{quizId}/questions', 'post', 201),
      swaggerSpec
    );
    expect(errors).toEqual([]);
  });

  it('defaults time to 0 when it is omitted', async () => {
    const { time, ...body } = validQuestion();
    const res = await owner.post(`/api/quizzes/${quiz._id}/questions`).send(body);

    expect(res.status).toBe(201);
    expect(res.body.question.time).toBe(0);
  });

  it('returns 400 when validAnswer does not match any answer id', async () => {
    const res = await owner
      .post(`/api/quizzes/${quiz._id}/questions`)
      .send(validQuestion({ validAnswer: 'zzz' }));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/validAnswer/);
    expect(await Question.countDocuments({})).toBe(0);
  });

  it.each([
    ['description shorter than 8', { description: '1234567' }],
    ['description longer than 128', { description: 'x'.repeat(129) }],
    ['empty answer text', { answers: [{ id: 'a', text: '' }, { id: 'b', text: 'Rome' }] }],
    ['answer text longer than 128', { answers: [{ id: 'a', text: 'x'.repeat(129) }, { id: 'b', text: 'Rome' }] }],
    ['a single answer', { answers: [{ id: 'a', text: 'Paris' }] }],
    ['duplicate answer ids', { answers: [{ id: 'a', text: 'Paris' }, { id: 'a', text: 'Rome' }] }],
    ['unknown type', { type: 'essay' }],
    ['negative time', { time: -1 }],
    ['non-integer time', { time: 1.5 }]
  ])('returns 400 for %s', async (_label, overrides) => {
    const res = await owner
      .post(`/api/quizzes/${quiz._id}/questions`)
      .send(validQuestion(overrides));

    expect(res.status).toBe(400);
    expect(await Question.countDocuments({})).toBe(0);
  });

  it('accepts boundary lengths (description 8 and 128, answer text 1 and 128)', async () => {
    const res = await owner.post(`/api/quizzes/${quiz._id}/questions`).send(
      validQuestion({
        description: 'x'.repeat(8),
        answers: [
          { id: 'a', text: 'x' },
          { id: 'b', text: 'y'.repeat(128) }
        ]
      })
    );
    expect(res.status).toBe(201);

    const res2 = await owner
      .post(`/api/quizzes/${quiz._id}/questions`)
      .send(validQuestion({ description: 'x'.repeat(128) }));
    expect(res2.status).toBe(201);
  });

  it.each(['type', 'description', 'answers', 'validAnswer'])('returns 400 when %s is missing', async (field) => {
    const body = validQuestion();
    delete body[field];

    const res = await owner.post(`/api/quizzes/${quiz._id}/questions`).send(body);
    expect(res.status).toBe(400);
  });

  it('requires authentication', async () => {
    const res = await request(app).post(`/api/quizzes/${quiz._id}/questions`).send(validQuestion());
    expect(res.status).toBe(401);
  });

  it("returns 403 for someone else's quiz and creates nothing", async () => {
    const res = await stranger.post(`/api/quizzes/${quiz._id}/questions`).send(validQuestion());

    expect(res.status).toBe(403);
    expect(await Question.countDocuments({})).toBe(0);
  });

  it('returns 404 for a missing quiz and 400 for a malformed id', async () => {
    const missing = new mongoose.Types.ObjectId();

    expect((await owner.post(`/api/quizzes/${missing}/questions`).send(validQuestion())).status).toBe(404);
    expect((await owner.post('/api/quizzes/not-an-id/questions').send(validQuestion())).status).toBe(400);
  });

  it('makes the question visible in GET /api/quizzes/:id', async () => {
    await createQuestion();

    const res = await request(app).get(`/api/quizzes/${quiz._id}`);

    expect(res.status).toBe(200);
    expect(res.body.quiz.questions).toHaveLength(1);
    expect(res.body.quiz.questions[0].validAnswer).toBe('a');
  });
});

describe('PATCH /api/questions/:id', () => {
  it('updates any single field', async () => {
    const question = await createQuestion();

    const res = await owner
      .patch(`/api/questions/${question._id}`)
      .send({ description: 'Which city is the capital of France?', time: 45, type: 'true-false' });

    expect(res.status).toBe(200);
    expect(res.body.question).toMatchObject({
      description: 'Which city is the capital of France?',
      time: 45,
      type: 'true-false',
      validAnswer: 'a'
    });

    const errors = collectErrors(
      res.body,
      responseSchema(swaggerSpec, '/api/questions/{id}', 'patch', 200),
      swaggerSpec
    );
    expect(errors).toEqual([]);
  });

  it('updates answers together with validAnswer', async () => {
    const question = await createQuestion();

    const res = await owner.patch(`/api/questions/${question._id}`).send({
      answers: [
        { id: 'x', text: 'Madrid' },
        { id: 'y', text: 'Lisbon' }
      ],
      validAnswer: 'y'
    });

    expect(res.status).toBe(200);
    expect(res.body.question.validAnswer).toBe('y');
    expect(res.body.question.answers).toHaveLength(2);
  });

  it('returns 400 when validAnswer alone does not match the stored answers', async () => {
    const question = await createQuestion();

    const res = await owner.patch(`/api/questions/${question._id}`).send({ validAnswer: 'nope' });

    expect(res.status).toBe(400);
    expect((await Question.findById(question._id)).validAnswer).toBe('a');
  });

  it('returns 400 when new answers drop the stored validAnswer', async () => {
    const question = await createQuestion();

    const res = await owner.patch(`/api/questions/${question._id}`).send({
      answers: [
        { id: 'x', text: 'Madrid' },
        { id: 'y', text: 'Lisbon' }
      ]
    });

    expect(res.status).toBe(400);
    expect((await Question.findById(question._id)).answers).toHaveLength(3);
  });

  it('returns 400 when answers and validAnswer sent together do not match', async () => {
    const question = await createQuestion();

    const res = await owner.patch(`/api/questions/${question._id}`).send({
      answers: [
        { id: 'x', text: 'Madrid' },
        { id: 'y', text: 'Lisbon' }
      ],
      validAnswer: 'a'
    });

    expect(res.status).toBe(400);
  });

  it('applies the same Joi limits as creation and rejects an empty body', async () => {
    const question = await createQuestion();

    for (const body of [
      {},
      { description: 'short' },
      { description: 'x'.repeat(129) },
      { answers: [{ id: 'a', text: '' }, { id: 'b', text: 'Rome' }] },
      { type: 'essay' },
      { time: -5 }
    ]) {
      const res = await owner.patch(`/api/questions/${question._id}`).send(body);
      expect(res.status).toBe(400);
    }
  });

  it('requires authentication', async () => {
    const question = await createQuestion();
    const res = await request(app).patch(`/api/questions/${question._id}`).send({ time: 10 });
    expect(res.status).toBe(401);
  });

  it("returns 403 and changes nothing for someone else's question", async () => {
    const question = await createQuestion();

    const res = await stranger.patch(`/api/questions/${question._id}`).send({ time: 99 });

    expect(res.status).toBe(403);
    expect((await Question.findById(question._id)).time).toBe(30);
  });

  it('returns 404 for a missing question and 400 for a malformed id', async () => {
    const missing = new mongoose.Types.ObjectId();

    expect((await owner.patch(`/api/questions/${missing}`).send({ time: 10 })).status).toBe(404);
    expect((await owner.patch('/api/questions/not-an-id').send({ time: 10 })).status).toBe(400);
  });

  it('returns 404 when the quiz of the question no longer exists', async () => {
    const orphan = await Question.create({ ...validQuestion(), quiz: new mongoose.Types.ObjectId() });

    const res = await owner.patch(`/api/questions/${orphan._id}`).send({ time: 10 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/questions/:id', () => {
  it('deletes the question and leaves the others', async () => {
    const first = await createQuestion();
    const second = await createQuestion(validQuestion({ description: 'Another valid question' }));

    const res = await owner.delete(`/api/questions/${first._id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(first._id);
    expect(await Question.countDocuments({ _id: first._id })).toBe(0);
    expect(await Question.countDocuments({ _id: second._id })).toBe(1);
  });

  it('requires authentication', async () => {
    const question = await createQuestion();
    const res = await request(app).delete(`/api/questions/${question._id}`);

    expect(res.status).toBe(401);
    expect(await Question.countDocuments({ _id: question._id })).toBe(1);
  });

  it("returns 403 and keeps someone else's question", async () => {
    const question = await createQuestion();

    const res = await stranger.delete(`/api/questions/${question._id}`);

    expect(res.status).toBe(403);
    expect(await Question.countDocuments({ _id: question._id })).toBe(1);
  });

  it('returns 404 for a missing question and 400 for a malformed id', async () => {
    const missing = new mongoose.Types.ObjectId();

    expect((await owner.delete(`/api/questions/${missing}`)).status).toBe(404);
    expect((await owner.delete('/api/questions/not-an-id')).status).toBe(400);
  });
});
