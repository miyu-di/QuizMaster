import { configureStore, createSlice } from '@reduxjs/toolkit';

const appSlice = createSlice({
  name: 'app',
  initialState: {
    isAuthenticated: false,
  },
  reducers: {
    setAuthenticated(state, action: { payload: boolean }) {
      state.isAuthenticated = action.payload;
    },
  },
});

export const { setAuthenticated } = appSlice.actions;

export const store = configureStore({
  reducer: {
    app: appSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;