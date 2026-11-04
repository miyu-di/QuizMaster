import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch } from '../../redux/hooks';
import { login } from '../../redux/auth/operations';
import { loginSchema } from '../../validation/authSchemas';
import type { LoginFormValues } from '../../validation/authSchemas';
import css from '../AuthForm/AuthForm.module.css';

const LoginForm = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await dispatch(login(values)).unwrap();
      navigate('/', { replace: true });
    } catch (message) {
      toast.error(String(message));
    }
  };

  return (
    <div className={css.container} role="dialog" aria-labelledby="login-title">
      <h2 id="login-title" className={css.title}>
        Log in
      </h2>

      <form className={css.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={css.field}>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            className={`${css.input} ${errors.email ? css.inputError : ''}`}
            {...register('email')}
          />
          <span className={css.error}>{errors.email?.message}</span>
        </div>

        <div className={css.field}>
          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            className={`${css.input} ${errors.password ? css.inputError : ''}`}
            {...register('password')}
          />
          <span className={css.error}>{errors.password?.message}</span>
        </div>

        <button type="submit" className={css.button} disabled={isSubmitting}>
          {isSubmitting ? 'Loading...' : 'Enter'}
        </button>
      </form>

      <div className={css.links}>
        <Link to="/auth/restore-password">Restore password</Link>
        <Link to="/auth/register">Register</Link>
      </div>
    </div>
  );
};

export default LoginForm;
