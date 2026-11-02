const createError = require('http-errors');
const Quiz = require('../models/Quiz');

async function findOwnedQuiz(quizId, userId) {
  const quiz = await Quiz.findById(quizId);

  if (!quiz) {
    throw createError(404, 'Quiz not found');
  }
  if (!quiz.owner.equals(userId)) {
    throw createError(403, 'You can only modify your own quizzes');
  }

  return quiz;
}

module.exports = findOwnedQuiz;
