process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.CLIENT_URL = 'http://localhost:5173';

const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../src/app');
const User = require('../src/models/User');

let mongod;

const validUser = { name: 'Alex', email: 'alex@example.com', password: 'password123' };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('POST /api/auth/register', () => {
  it('creates a user, sets an HttpOnly token cookie and never returns the password', async () => {
    const res = await request(app).post('/api/auth/register').send(validUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Alex', email: 'alex@example.com' });
    expect(res.body.user.password).toBeUndefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.join(';')).toMatch(/token=.+/);
    expect(cookies.join(';')).toMatch(/HttpOnly/i);

    const inDb = await User.findOne({ email: 'alex@example.com' }).select('+password');
    expect(inDb.password).not.toBe(validUser.password);
  });

  it('normalizes the email to lower case', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, email: '  Alex@Example.COM ' });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('alex@example.com');
  });

  it('returns 409 for a duplicate email and does not create a second user', async () => {
    await request(app).post('/api/auth/register').send(validUser);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validUser, name: 'Other' });

    expect(res.status).toBe(409);
    expect(await User.countDocuments({ email: 'alex@example.com' })).toBe(1);
  });

  it.each([
    ['missing name', { email: 'a@example.com', password: 'password123' }],
    ['empty name', { name: '', email: 'a@example.com', password: 'password123' }],
    ['too long name', { name: 'x'.repeat(33), email: 'a@example.com', password: 'password123' }],
    ['invalid email', { name: 'Alex', email: 'not-an-email', password: 'password123' }],
    ['missing email', { name: 'Alex', password: 'password123' }],
    ['short password', { name: 'Alex', email: 'a@example.com', password: 'short' }],
    ['too long password', { name: 'Alex', email: 'a@example.com', password: 'x'.repeat(65) }],
    ['empty body', {}]
  ])('returns 400 for %s', async (_label, body) => {
    const res = await request(app).post('/api/auth/register').send(body);

    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(expect.any(String));
    expect(await User.countDocuments({})).toBe(0);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(validUser);
  });

  it('logs in with correct credentials and sets the cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: validUser.password });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.password).toBeUndefined();
    expect(res.headers['set-cookie'].join(';')).toMatch(/token=.+/);
  });

  it('returns 401 for a wrong password and sets no cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: validUser.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('returns 401 for an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('returns 400 for an invalid body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'bad', password: '1' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/users/current', () => {
  it('returns 401 without a cookie', async () => {
    const res = await request(app).get('/api/users/current');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const res = await request(app).get('/api/users/current').set('Cookie', 'token=garbage');
    expect(res.status).toBe(401);
  });

  it('returns 401 when the user of the token no longer exists', async () => {
    const agent = request.agent(app);
    const reg = await agent.post('/api/auth/register').send(validUser);
    await User.deleteOne({ _id: reg.body.user._id });

    const res = await agent.get('/api/users/current');
    expect(res.status).toBe(401);
  });

  it('returns the current user when the cookie is present', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);

    const res = await agent.get('/api/users/current');

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(validUser.email);
    expect(res.body.user.password).toBeUndefined();
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the cookie so that current returns 401 afterwards', async () => {
    const agent = request.agent(app);
    await agent.post('/api/auth/register').send(validUser);
    expect((await agent.get('/api/users/current')).status).toBe(200);

    const res = await agent.post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
    expect(res.headers['set-cookie'].join(';')).toMatch(/token=;/);
    expect((await agent.get('/api/users/current')).status).toBe(401);
  });

  it('succeeds even without a cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
  });
});
