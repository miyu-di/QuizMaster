const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: String, default: '' },
    rate: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model('Review', reviewSchema);
