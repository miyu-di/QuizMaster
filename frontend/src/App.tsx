import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SharedLayout } from './components/SharedLayout';
import { HomePage } from './pages/HomePage';
import { DiscoverPage } from './pages/DiscoverPage';
import { FavoritePage } from './pages/FavoritePage';
import { MyQuizzesPage } from './pages/MyQuizzesPage';
import { SettingsPage } from './pages/SettingsPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { useEffect } from 'react';
import { useAppDispatch } from './redux/hooks';
import { refreshUser } from './redux/auth/operations';
import AuthPage from './pages/AuthPage/AuthPage';
import PrivateRoute from './routes/PrivateRoute';

// const Stub = ({ name }: { name: string }) => <p>{name}</p>;

function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(refreshUser());
  }, [dispatch])

  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <Routes>
        <Route element={<SharedLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/:authType" element={<AuthPage />} />
        </Route>
        <Route element={<PrivateRoute />}>
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/favorites" element={<FavoritePage />} />
          <Route path="/my-quizzes" element={<MyQuizzesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        <Route />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
