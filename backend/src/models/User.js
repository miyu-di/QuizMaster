const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    correctAnswers: { type: Number, required: true, min: 0 },
    totalQuestions: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 32 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    avatarURL: { type: String, default: '' },
    favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' }],
    results: { type: [resultSchema], default: [] }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('User', userSchema);
