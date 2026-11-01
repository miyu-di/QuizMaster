function toPublicQuestion(question) {
  return {
    _id: question._id,
    type: question.type,
    time: question.time,
    description: question.description,
    image: question.image,
    answers: question.answers,
    validAnswer: question.validAnswer
  };
}

module.exports = toPublicQuestion;
