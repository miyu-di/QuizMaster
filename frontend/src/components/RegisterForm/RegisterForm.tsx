import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAppDispatch } from '../../redux/hooks';
import { register as registerUser } from '../../redux/auth/operations';
import { registerSchema } from '../../validation/authSchemas';
import type { RegisterFormValues } from '../../validation/authSchemas';
import css from '../AuthForm/AuthForm.module.css';

const RegisterForm = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: yupResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      await dispatch(registerUser(values)).unwrap();
      navigate('/', { replace: true });
    } catch (message) {
      toast.error(String(message));
    }
  };

  return (
    <div className={css.container} role="dialog" aria-labelledby="register-title">
      <h2 id="register-title" className={css.title}>
        Sign in
      </h2>

      <form className={css.form} onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className={css.field}>
          <input
            type="text"
            placeholder="Name"
            autoComplete="name"
            className={`${css.input} ${errors.name ? css.inputError : ''}`}
            {...register('name')}
          />
          <span className={css.error}>{errors.name?.message}</span>
        </div>

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
            autoComplete="new-password"
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
        <Link to="/auth/login">Log in</Link>
      </div>
    </div>
  );
};

export default RegisterForm;
