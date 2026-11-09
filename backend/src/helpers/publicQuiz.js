// isFavorite передається лише для авторизованого користувача; для гостя поле не додається.
function toPublicQuiz(quiz, isFavorite) {
  const result = {
    _id: quiz._id,
    title: quiz.title,
    owner: quiz.owner,
    ageGroup: quiz.ageGroup,
    category: quiz.category,
    background: quiz.background,
    rating: quiz.rating,
    reviewsCount: quiz.reviewsCount,
    passCount: quiz.passCount,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt
  };

  if (isFavorite !== undefined) {
    result.isFavorite = isFavorite;
  }

  return result;
}

module.exports = toPublicQuiz;
