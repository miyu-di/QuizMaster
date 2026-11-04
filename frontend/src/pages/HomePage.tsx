import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export function HomePage() {
  return (
    <main className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-greeting">Hello visitor!</p>

          <p className="hero-description">
            On the site you will find quizzes with various types of questions:
            cinema, music, logic and others. Quizzes differ in difficulty, the
            number of questions and answer types.
          </p>

          <div className="hero-actions">
            <Link className="btn btn-primary" to="/discover">
              Choose a test
            </Link>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => toast('Sign in to create a quiz.')}
            >
              Create a quiz
            </button>
          </div>
        </div>

        <h1 className="hero-title">Are you ready to take the Quiz?</h1>
      </section>

      <ul className="advantages" aria-label="QuizMaster advantages">
        <li>Own platform</li>
        <li>Create exclusive quests</li>
        <li>Large assortment of quizzes</li>
      </ul>
    </main>
  );
}