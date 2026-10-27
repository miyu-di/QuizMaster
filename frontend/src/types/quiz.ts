export type Question = {
  id: string;
  text: string;
  answers: string[];
  correctAnswer: number;
};

export type Quiz = {
  id: string;
  title: string;
  description: string;
  category: string;
  questions: Question[];
  authorId: string;
  createdAt: string;
};
