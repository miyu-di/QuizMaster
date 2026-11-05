import { Outlet } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import { Header } from './Header';
import { selectIsLoggedIn, selectUser } from '../redux/auth/selectors';

export function SharedLayout() {;

  const isAuthenticated = useAppSelector(selectIsLoggedIn);
  const user = useAppSelector(selectUser);

return (
  <>
    <Header isAuthenticated={isAuthenticated} user={user} />
    <Outlet />
  </>
);
}