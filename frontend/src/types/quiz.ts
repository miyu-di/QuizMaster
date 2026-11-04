export type QuizAgeGroup = 'adults' | 'children';

export type QuestionType = 'true-false' | 'full-text';

export type AnswerOption = {
  id: string;
  text: string;
};

export type Question = {
  _id: string;
  quiz: string;
  type: QuestionType;
  time: number;
  description: string;
  image: string;
  answers: AnswerOption[];
  validAnswer: string;
};

export type Quiz = {
  _id: string;
  title: string;
  owner: string;
  ageGroup: QuizAgeGroup;
  category: string;
  background: string;
  rating: number;
  reviewsCount: number;
  passCount: number;
  createdAt: string;
  updatedAt: string;
};

export type QuizWithQuestions = Quiz & {
  questions: Question[];
};