import * as yup from 'yup';

const email = yup.string().trim().email('Enter a valid email').required('Email is required');

const password = yup
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(64, 'Password must be at most 64 characters')
  .required('Password is required');

export const loginSchema = yup.object({ email, password });

export const registerSchema = yup.object({
  name: yup
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(32, 'Name must be at most 32 characters')
    .required('Name is required'),
  email,
  password,
});

export type LoginFormValues = yup.InferType<typeof loginSchema>;
export type RegisterFormValues = yup.InferType<typeof registerSchema>;
