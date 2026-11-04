import { createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../../api/instance';
import { getErrorMessage } from '../../api/getErrorMessage';
import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../../types/auth';

const normalizeUser = (data: AuthResponse): User => ('user' in data ? data.user : data);

export const register = createAsyncThunk<User, RegisterPayload, { rejectValue: string }>(
  'auth/register',
  async (credentials, thunkAPI) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/register', credentials);
      return normalizeUser(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(getErrorMessage(error));
    }
  },
);

export const login = createAsyncThunk<User, LoginPayload, { rejectValue: string }>(
  'auth/login',
  async (credentials, thunkAPI) => {
    try {
      const { data } = await api.post<AuthResponse>('/auth/login', credentials);
      return normalizeUser(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(getErrorMessage(error));
    }
  },
);

export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async (_, thunkAPI) => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      return thunkAPI.rejectWithValue(getErrorMessage(error));
    }
  },
);

export const refreshUser = createAsyncThunk<User, void, { rejectValue: string }>(
  'auth/refreshUser',
  async (_, thunkAPI) => {
    try {
      const { data } = await api.get<AuthResponse>('/users/current');
      return normalizeUser(data);
    } catch (error) {
      return thunkAPI.rejectWithValue(getErrorMessage(error));
    }
  },
);
