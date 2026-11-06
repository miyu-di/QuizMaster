import { Link, NavLink } from 'react-router-dom';
import type { User } from '../types/auth';
import { useState } from 'react';
import { ModalLogout } from './ModalLogout/ModalLogout';
import Modal from './Modal/Modal';

type HeaderProps = {
  isAuthenticated: boolean;
  user: User | null;
};

export function Header({ isAuthenticated, user }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  return (
    <header className="site-header">
      <Link className="logo" to="/" aria-label="Quiz Master — на головну">
        QuizMaster
      </Link>

      <button
  className="mobile-menu-toggle"
  type="button"
  aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
  aria-expanded={isMenuOpen}
  aria-controls="mobile-menu"
  onClick={() => setIsMenuOpen((open) => !open)}
>
  <span />
  <span />
  <span />
</button>

{isMenuOpen && (
  <Modal onClose={() => setIsMenuOpen(false)}>
    <nav
      className="mobile-menu"
      id="mobile-menu"
      aria-label="Mobile navigation"
    >
      {isAuthenticated ? (
        <>
          <NavLink to="/" onClick={() => setIsMenuOpen(false)}>Home</NavLink>
          <NavLink to="/discover" onClick={() => setIsMenuOpen(false)}>Discover</NavLink>
          <NavLink to="/favorites" onClick={() => setIsMenuOpen(false)}>Favorite quiz</NavLink>
          <NavLink to="/my-quizzes" onClick={() => setIsMenuOpen(false)}>My quiz</NavLink>
          <Link to="/settings" onClick={() => setIsMenuOpen(false)}>Settings</Link>
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setIsLogoutModalOpen(true);
            }}
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/adults" onClick={() => setIsMenuOpen(false)}>For Adults</Link>
          <Link to="/children" onClick={() => setIsMenuOpen(false)}>For Children</Link>
          <Link to="/auth/login" onClick={() => setIsMenuOpen(false)}>Log in</Link>
          <Link to="/auth/register" onClick={() => setIsMenuOpen(false)}>Register</Link>
        </>
      )}
    </nav>
  </Modal>
)}

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
          {user?.avatarURL ? (
            <img className="avatar" src={user.avatarURL} alt="" />
          ) : (
            <span className="avatar" aria-hidden="true">
              {user?.name?.charAt(0).toUpperCase() ?? 'U'}
            </span>
          )}
          <span>{user?.name ?? 'User'}</span>
          
        </summary>
        <nav aria-label="Меню користувача">
          <Link to="/settings">Settings</Link>
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
          >
            Logout
          </button>
        </nav>
      </details>
    </>
  ) : (
    <>
      <nav className="quiz-types" aria-label="Типи вікторин">
        <Link to="/adults">For Adults</Link>
        <Link to="/children">For Children</Link>
      </nav>
      <nav className="auth-nav" aria-label="Авторизація">
        <Link to="/auth/login">Log in</Link>
        <Link to="/auth/register">Register</Link>
      </nav>
    </>
  )}

  {isLogoutModalOpen && (
    <ModalLogout onClose={() => setIsLogoutModalOpen(false)} />
  )}
</header>
  );
}
