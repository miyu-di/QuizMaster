import axios from 'axios';

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    if (!error.response) {
      return 'Network error. Please check your connection.';
    }
    return error.response.data?.message ?? error.message;
  }
  return 'Something went wrong';
};
