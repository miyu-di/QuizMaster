import { Outlet } from 'react-router-dom';

export function SharedLayout() {
  return (
    <>
      <header>
        <a href="/">QuizMaster</a>
      </header>
      <Outlet />
    </>
  );
}
