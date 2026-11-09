const toFilteredQuiz = require('./publicFilteredQuiz');

// Картка тесту для GET /api/quizzes/last-passed: ті самі поля, що у фільтрі, + останній результат.
function toLastPassedQuiz(quiz, isFavorite, result) {
  return {
    ...toFilteredQuiz(quiz, isFavorite),
    lastResult: {
      correctAnswers: result.correctAnswers,
      totalQuestions: result.totalQuestions,
      date: result.date
    }
  };
}

module.exports = toLastPassedQuiz;
