const Joi = require('joi');
const { AGE_GROUPS, ALL_CATEGORIES, BACKGROUNDS } = require('../config/quizOptions');
const { paginationFields, MIN_LIMIT, MAX_LIMIT } = require('./paginationValidators');

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
  sort: Joi.string().valid('popular', 'latest').default('popular'),
  ...paginationFields
});

// Порція фільтра — 8 тестів (діапазон limit той самий, що й у GET /api/quizzes).
const FILTER_DEFAULT_LIMIT = MAX_LIMIT;

// categories: ?categories=History&categories=Art або ?categories=History,Art (назви без ком).
// Порожнє значення = категорії не передані (пошук по всіх).
const categoriesField = Joi.any().custom((value, helpers) => {
  const list = [...new Set([].concat(value).flatMap((item) => String(item).split(',')).map((item) => item.trim()))]
    .filter(Boolean);
  const unknown = list.find((item) => !ALL_CATEGORIES.includes(item));
  if (unknown) {
    return helpers.message(`"categories" contains unknown category "${unknown}"`);
  }
  return list;
});

const filterQuizzesSchema = Joi.object({
  categories: categoriesField.default([]),
  ageGroup: Joi.string().valid(...AGE_GROUPS).empty(''),
  // rating — мінімальний рейтинг: повертаються тести з rating >= значення.
  rating: Joi.number().min(0).max(5).empty(''),
  search: Joi.string().trim().max(100).empty(''),
  page: paginationFields.page,
  limit: Joi.number().integer().min(MIN_LIMIT).max(MAX_LIMIT).default(FILTER_DEFAULT_LIMIT)
});

// Приватні списки (own, favorites, last-passed): порція 8, пагінація та сама (limit 4–8, page від 1).
// Інші параметри (наприклад, owner) відкидає validateQuery — вибірка завжди за поточним користувачем.
const PRIVATE_LIST_DEFAULT_LIMIT = MAX_LIMIT;

const privateListSchema = Joi.object({
  page: paginationFields.page,
  limit: Joi.number().integer().min(MIN_LIMIT).max(MAX_LIMIT).default(PRIVATE_LIST_DEFAULT_LIMIT)
});

module.exports = {
  createQuizSchema,
  updateQuizSchema,
  listQuizzesSchema,
  filterQuizzesSchema,
  privateListSchema
};
