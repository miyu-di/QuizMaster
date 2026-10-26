const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ageGroup: { type: String, enum: ['adults', 'children'], default: 'adults' },
    category: { type: String, required: true, trim: true },
    background: { type: String, default: '' },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    passCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Quiz', quizSchema);
