type QuizListPageProps = {
  ageGroup: 'adults' | 'children';
};

export function QuizListPage({ ageGroup }: QuizListPageProps) {
  const title =
    ageGroup === 'adults' ? 'Quizzes for Adults' : 'Quizzes for Children';

  return (
    <main className="container">
      <h1 className="title">{title}</h1>
    </main>
  );
}