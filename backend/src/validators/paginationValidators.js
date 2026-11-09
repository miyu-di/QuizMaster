const Joi = require('joi');

// Єдина пагінація для всіх колекцій: limit 4–8 (за замовчуванням 4), page від 1.
const MIN_LIMIT = 4;
const MAX_LIMIT = 8;
const DEFAULT_LIMIT = MIN_LIMIT;

// Поля розкладаються в Joi.object({ ...paginationFields, ... }) будь-якого списку.
const paginationFields = {
  limit: Joi.number().integer().min(MIN_LIMIT).max(MAX_LIMIT).default(DEFAULT_LIMIT),
  page: Joi.number().integer().min(1).default(1)
};

module.exports = { paginationFields, MIN_LIMIT, MAX_LIMIT, DEFAULT_LIMIT };
