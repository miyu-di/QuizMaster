// Скорочена картка тесту для GET /api/quizzes/filter. isFavorite завжди boolean (для гостя — false).
function toFilteredQuiz(quiz, isFavorite) {
  return {
    id: String(quiz._id),
    title: quiz.title,
    category: quiz.category,
    rating: quiz.rating,
    isFavorite: Boolean(isFavorite),
    passCount: quiz.passCount
  };
}

// Поля тесту, які потрібні для картки (для .select() у запитах).
toFilteredQuiz.FIELDS = 'title category rating passCount';

module.exports = toFilteredQuiz;
