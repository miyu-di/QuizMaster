import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAppDispatch } from '../../redux/hooks';
import { logout } from '../../redux/auth/operations';
import Modal from '../Modal/Modal';
import css from './ModalLogout.module.css';

type ModalLogoutProps = {
  onClose: () => void;
};

export function ModalLogout({ onClose }: ModalLogoutProps) {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      await dispatch(logout()).unwrap();
      onClose();
    } catch (error) {
      toast.error(
        typeof error === 'string' ? error : 'Could not log out. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <section
        className={css.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        aria-describedby="logout-description"
      >
        <h2 className={css.title} id="logout-title">
          Log out?
        </h2>

        <p className={css.description} id="logout-description">
          Are you sure you want to log out?
        </p>

        <div className={css.actions}>
          <button
            className={`${css.button} ${css.cancelButton}`}
            type="button"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>

          <button
            className={`${css.button} ${css.logoutButton}`}
            type="button"
            onClick={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </section>
    </Modal>
  );
}