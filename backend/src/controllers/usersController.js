const Quiz = require('../models/Quiz');
const toPublicUser = require('../helpers/publicUser');
const toFilteredQuiz = require('../helpers/publicFilteredQuiz');
const { getSkip, hasMorePages } = require('../helpers/pagination');

function getCurrentUser(req, res) {
  res.status(200).json({ user: toPublicUser(req.user) });
}

// Обрані тести поточного користувача: від останнього доданого до першого.
// Тести, яких уже немає, пропускаємо, щоб total збігався з тим, що можна отримати сторінками.
async function getFavorites(req, res, next) {
  try {
    const { page, limit } = req.validatedQuery;
    const ids = [...new Set(req.user.favorites.map(String))].reverse();

    const quizzes = await Quiz.find({ _id: { $in: ids } })
      .select(toFilteredQuiz.FIELDS)
      .lean();
    const quizById = new Map(quizzes.map((quiz) => [String(quiz._id), quiz]));

    const existing = ids.filter((id) => quizById.has(id));
    const total = existing.length;
    const skip = getSkip({ page, limit });

    res.status(200).json({
      // Усі тут — в обраних, тож isFavorite завжди true.
      quizzes: existing.slice(skip, skip + limit).map((id) => toFilteredQuiz(quizById.get(id), true)),
      total,
      hasMore: hasMorePages({ page, limit, total })
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getCurrentUser, getFavorites };
