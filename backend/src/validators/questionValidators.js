const Joi = require('joi');
const {
  QUESTION_TYPES,
  DESCRIPTION_MIN,
  DESCRIPTION_MAX,
  ANSWER_TEXT_MIN,
  ANSWER_TEXT_MAX,
  ANSWERS_MIN,
  ANSWERS_MAX,
  TIME_MAX
} = require('../config/questionOptions');

const VALID_ANSWER_MESSAGE = '"validAnswer" must match the id of one of the answers';

const answer = Joi.object({
  id: Joi.string().trim().min(1).max(64).required(),
  text: Joi.string().trim().min(ANSWER_TEXT_MIN).max(ANSWER_TEXT_MAX).required()
});

const answers = Joi.array()
  .items(answer)
  .min(ANSWERS_MIN)
  .max(ANSWERS_MAX)
  .unique('id')
  .messages({ 'array.unique': 'Answer ids must be unique' });

const type = Joi.string().valid(...QUESTION_TYPES);
const time = Joi.number().integer().min(0).max(TIME_MAX);
const description = Joi.string().trim().min(DESCRIPTION_MIN).max(DESCRIPTION_MAX);
const validAnswer = Joi.string().trim().min(1).max(64);

// Перевірка збігу validAnswer з id одного з варіантів. Працює, коли в тілі є обидва поля;
// якщо у PATCH передано лише одне з них, збіг перевіряється в контролері проти збереженого питання.
function validAnswerMatchesAnswers(value, helpers) {
  if (value.answers && value.validAnswer !== undefined) {
    const matches = value.answers.some((item) => item.id === value.validAnswer);
    if (!matches) {
      return helpers.message(VALID_ANSWER_MESSAGE);
    }
  }
  return value;
}

const createQuestionSchema = Joi.object({
  type: type.required(),
  time: time.default(0),
  description: description.required(),
  answers: answers.required(),
  validAnswer: validAnswer.required()
}).custom(validAnswerMatchesAnswers);

const updateQuestionSchema = Joi.object({
  type,
  time,
  description,
  answers,
  validAnswer
})
  .min(1)
  .messages({ 'object.min': 'Provide at least one field to update' })
  .custom(validAnswerMatchesAnswers);

module.exports = { createQuestionSchema, updateQuestionSchema, VALID_ANSWER_MESSAGE };
