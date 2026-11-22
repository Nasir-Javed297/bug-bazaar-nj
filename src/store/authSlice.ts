// The logged-in session. (The login form, token storage and 401 handling come in task D3-3.)
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../types/api";
import type { RootState } from "./store";

export type Session = {
  token: string;
  user: User;
};

export type AuthState = {
  // One value instead of separate `token` and `user` fields: you either have BOTH or neither.
  // "A token but no user" can't be represented.
  session: Session | null;
};

const initialState: AuthState = { session: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loggedIn(state, action: PayloadAction<Session>) {
      state.session = action.payload;
    },
    loggedOut(state) {
      state.session = null;
    },
  },
});

export const { loggedIn, loggedOut } = authSlice.actions;
export const authReducer = authSlice.reducer;

export const selectSession = (state: RootState) => state.auth.session;
export const selectCurrentUser = (state: RootState) => state.auth.session?.user ?? null;
export const selectAuthToken = (state: RootState) => state.auth.session?.token ?? null;
export const selectIsLoggedIn = (state: RootState) => state.auth.session !== null;
