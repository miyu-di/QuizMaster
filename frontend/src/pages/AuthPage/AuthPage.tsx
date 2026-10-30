import { useCallback } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import Modal from '../../components/Modal/Modal';
import LoginForm from '../../components/LoginForm/LoginForm';
import RegisterForm from '../../components/RegisterForm/RegisterForm';

const AuthPage = () => {
  const { authType } = useParams<{ authType: string }>();
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    navigate('/', { replace: true });
  }, [navigate]);

  if (authType !== 'login' && authType !== 'register') {
    return <Navigate to="/auth/login" replace />;
  }

  return (
    <Modal onClose={handleClose}>{authType === 'login' ? <LoginForm /> : <RegisterForm />}</Modal>
  );
};

export default AuthPage;
