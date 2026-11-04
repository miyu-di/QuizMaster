import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../redux/hooks';
import { selectIsLoggedIn } from '../redux/auth/selectors';

const RestrictedRoute = () => {
  const isLoggedIn = useAppSelector(selectIsLoggedIn);

  return isLoggedIn ? <Navigate to="/home" replace /> : <Outlet />;
};

export default RestrictedRoute;
