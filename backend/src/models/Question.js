const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema(
  {
    quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    type: { type: String, required: true, trim: true },
    time: { type: Number, default: 0, min: 0 },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    answers: { type: [mongoose.Schema.Types.Mixed], default: [] },
    validAnswer: { type: mongoose.Schema.Types.Mixed, required: true }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model('Question', questionSchema);
