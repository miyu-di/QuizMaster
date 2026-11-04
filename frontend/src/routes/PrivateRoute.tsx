import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../redux/hooks';
import { selectIsLoggedIn } from '../redux/auth/selectors';

const PrivateRoute = () => {
  const isLoggedIn = useAppSelector(selectIsLoggedIn);

  return isLoggedIn ? <Outlet /> : <Navigate to="/auth/login" replace />;
};

export default PrivateRoute;
