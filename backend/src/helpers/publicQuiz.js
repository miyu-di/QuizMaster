function toPublicQuiz(quiz) {
  return {
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
}

module.exports = toPublicQuiz;
