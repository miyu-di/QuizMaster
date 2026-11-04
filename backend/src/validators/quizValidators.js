const Joi = require('joi');
const { AGE_GROUPS, ALL_CATEGORIES, BACKGROUNDS } = require('../config/quizOptions');

const MIN_LIMIT = 4;
const MAX_LIMIT = 8;

const quizTheme = Joi.string().trim().min(3).max(32);
const quizAgeGroup = Joi.string().valid(...AGE_GROUPS);
const quizCategory = Joi.string().valid(...ALL_CATEGORIES);
const quizBackground = Joi.string().valid('', ...BACKGROUNDS);

const createQuizSchema = Joi.object({
  quizTheme: quizTheme.required()
});

const updateQuizSchema = Joi.object({
  quizTheme,
  quizAgeGroup,
  quizCategory,
  quizBackground
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one field to update' });

const listQuizzesSchema = Joi.object({
  type: Joi.string().valid(...AGE_GROUPS, 'both').default('both'),
  limit: Joi.number().integer().min(MIN_LIMIT).max(MAX_LIMIT).default(MIN_LIMIT),
  sort: Joi.string().valid('popular', 'latest').default('popular'),
  page: Joi.number().integer().min(1).default(1)
});

module.exports = { createQuizSchema, updateQuizSchema, listQuizzesSchema, MIN_LIMIT, MAX_LIMIT };
