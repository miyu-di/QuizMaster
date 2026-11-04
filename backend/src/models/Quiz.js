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

module.exports = mongoose.model('Quiz', quizSchema);
