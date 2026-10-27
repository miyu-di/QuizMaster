import { Link, NavLink } from 'react-router-dom';

type HeaderProps = {
  isAuthenticated: boolean;
};

export function Header({ isAuthenticated }: HeaderProps) {
  return (
    <header className="site-header">
      <Link className="logo" to="/" aria-label="Quiz Master — на головну">
        Quiz Master
      </Link>

      {isAuthenticated ? (
        <>
          <nav className="main-nav" aria-label="Основна навігація">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/discover">Discover</NavLink>
            <NavLink to="/favorites">Favorite quiz</NavLink>
            <NavLink to="/my-quizzes">My quiz</NavLink>
          </nav>

          <details className="user-menu">
            <summary>
              <span className="avatar" aria-hidden="true">
                М
              </span>
              <span>Марта</span>
            </summary>
            <nav aria-label="Меню користувача">
              <Link to="/settings">Settings</Link>
              <button type="button">Logout</button>
            </nav>
          </details>
        </>
      ) : (
        <>
          <nav className="quiz-types" aria-label="Типи вікторин">
            <Link to="/adults">Для дорослих</Link>
            <Link to="/children">Для дітей</Link>
          </nav>
          <nav className="auth-nav" aria-label="Авторизація">
            <Link to="/login">Log in</Link>
            <Link to="/register">Sign up</Link>
          </nav>
        </>
      )}
    </header>
  );
}
