const createError = require('http-errors');
const Question = require('../models/Question');
const Quiz = require('../models/Quiz');
const toPublicQuestion = require('../helpers/publicQuestion');
const findOwnedQuiz = require('../helpers/findOwnedQuiz');
const { VALID_ANSWER_MESSAGE } = require('../validators/questionValidators');

async function findOwnedQuestion(questionId, userId) {
  const question = await Question.findById(questionId);
  if (!question) {
    throw createError(404, 'Question not found');
  }

  const quiz = await Quiz.findById(question.quiz);
  if (!quiz) {
    throw createError(404, 'Quiz not found');
  }
  if (!quiz.owner.equals(userId)) {
    throw createError(403, 'You can only modify questions of your own quizzes');
  }

  return question;
}

async function createQuestion(req, res, next) {
  try {
    const quiz = await findOwnedQuiz(req.params.quizId, req.user._id);

    const question = await Question.create({ ...req.body, quiz: quiz._id });

    res.status(201).json({ question: toPublicQuestion(question) });
  } catch (error) {
    next(error);
  }
}

async function updateQuestion(req, res, next) {
  try {
    const question = await findOwnedQuestion(req.params.id, req.user._id);

    // Joi перевіряє збіг лише коли є обидва поля; тут — проти збереженого стану.
    const nextAnswers = req.body.answers ?? question.answers;
    const nextValidAnswer = req.body.validAnswer ?? question.validAnswer;
    const matches = nextAnswers.some((item) => item && item.id === nextValidAnswer);
    if (!matches) {
      throw createError(400, VALID_ANSWER_MESSAGE);
    }

    const updated = await Question.findOneAndUpdate(
      { _id: question._id },
      req.body,
      { new: true, runValidators: true }
    );

    res.status(200).json({ question: toPublicQuestion(updated) });
  } catch (error) {
    next(error);
  }
}

async function deleteQuestion(req, res, next) {
  try {
    const question = await findOwnedQuestion(req.params.id, req.user._id);

    await Question.deleteOne({ _id: question._id });

    res.status(200).json({ message: 'Question deleted successfully', id: question._id });
  } catch (error) {
    next(error);
  }
}

module.exports = { createQuestion, updateQuestion, deleteQuestion };
