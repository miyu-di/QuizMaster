const Quiz = require('../models/Quiz');

// Загальна кількість проходжень усіх тестів — сума passCount.
// Лічильник passCount збільшує POST /api/quizzes/:id/stats (для гостей і авторизованих).
async function getTotalStats(req, res, next) {
  try {
    const [row] = await Quiz.aggregate([{ $group: { _id: null, passedCount: { $sum: '$passCount' } } }]);

    res.status(200).json({ passedCount: row ? row.passedCount : 0 });
  } catch (error) {
    next(error);
  }
}

module.exports = { getTotalStats };
