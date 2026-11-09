process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const authenticateOptional = require('../src/middlewares/authenticateOptional');
const User = require('../src/models/User');

const userId = new mongoose.Types.ObjectId();

function run(cookies) {
  const req = { cookies };
  const next = jest.fn();
  return authenticateOptional(req, {}, next).then(() => ({ req, next }));
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('authenticateOptional', () => {
  it('passes a request without a cookie through as a guest', async () => {
    const findById = jest.spyOn(User, 'findById');

    const { req, next } = await run(undefined);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeUndefined();
    expect(findById).not.toHaveBeenCalled();
  });

  it('puts the user into req.user for a valid cookie', async () => {
    const user = { _id: userId, favorites: [] };
    jest.spyOn(User, 'findById').mockResolvedValue(user);
    const token = jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET);

    const { req, next } = await run({ token });

    expect(req.user).toBe(user);
    expect(next).toHaveBeenCalledWith();
  });

  it('passes through without an error for a malformed token', async () => {
    const { req, next } = await run({ token: 'garbage' });

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('passes through without an error for a token signed with another secret', async () => {
    const token = jwt.sign({ id: userId.toString() }, 'another-secret');

    const { req, next } = await run({ token });

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('passes through without an error for an expired token', async () => {
    const token = jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET, { expiresIn: -10 });

    const { req, next } = await run({ token });

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('passes through without an error when the payload id is not an ObjectId', async () => {
    const findById = jest.spyOn(User, 'findById');
    const token = jwt.sign({ id: 'not-an-object-id' }, process.env.JWT_SECRET);

    const { req, next } = await run({ token });

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
    expect(findById).not.toHaveBeenCalled();
  });

  it('passes through without an error when the user no longer exists', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue(null);
    const token = jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET);

    const { req, next } = await run({ token });

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  it('forwards unexpected database errors', async () => {
    const failure = new Error('db down');
    jest.spyOn(User, 'findById').mockRejectedValue(failure);
    const token = jwt.sign({ id: userId.toString() }, process.env.JWT_SECRET);

    const { next } = await run({ token });

    expect(next).toHaveBeenCalledWith(failure);
  });
});
