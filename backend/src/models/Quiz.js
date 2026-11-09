const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 32 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ageGroup: { type: String, enum: ['adults', 'children'], default: 'adults' },
    category: { type: String, default: '', trim: true },
    background: { type: String, default: '' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    passCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true, versionKey: false }
);

// Під вибірки GET /api/quizzes (популярні / останні в межах вікової групи).
quizSchema.index({ ageGroup: 1, passCount: -1, createdAt: -1 });
quizSchema.index({ ageGroup: 1, createdAt: -1 });

// Під GET /api/quizzes/filter: категорії + порядок «популярні спершу» (passCount, createdAt, _id),
// вікова група + мінімальний рейтинг. Пошук за назвою — регістронезалежний regex по вже
// звуженій вибірці (індекс по title для підрядка не допоміг би).
quizSchema.index({ category: 1, passCount: -1, createdAt: -1 });
quizSchema.index({ ageGroup: 1, category: 1, passCount: -1, createdAt: -1 });
quizSchema.index({ rating: -1, passCount: -1 });
quizSchema.index({ title: 1 });

// Під GET /api/quizzes/own: тести власника, найновіші спершу.
quizSchema.index({ owner: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('Quiz', quizSchema);
