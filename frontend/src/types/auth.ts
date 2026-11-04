export interface User {
  id: string;
  name: string;
  email: string;
  avatarURL?: string | null;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export type AuthResponse = User | { user: User };

export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  isRefreshing: boolean;
  error: string | null;
}