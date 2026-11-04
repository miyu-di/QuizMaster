export type QuizResult = {
  quiz: string;
  correctAnswers: number;
  totalQuestions: number;
  date: string;
};

export type User = {
  _id: string;
  name: string;
  email: string;
  avatarURL: string;
  favorites: string[];
  results: QuizResult[];
};