const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().trim().min(1).max(32).required(),
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().min(8).max(64).required()
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().min(8).max(64).required()
});

module.exports = { registerSchema, loginSchema };
