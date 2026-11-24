// The logged-in session. Where the token is stored and why: docs/auth.md.
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { User } from "../types/api";
import type { RootState } from "./store";

export type Session = {
  token: string;
  user: User;
};

/** Why the user was logged out, so the login page can explain it. */
export type LogoutReason = "user" | "expired";

export type AuthState = {
  // One value instead of separate `token` and `user` fields: you either have BOTH or neither.
  // "A token but no user" can't be represented.
  session: Session | null;
  logoutReason: LogoutReason | null;
};

const initialState: AuthState = { session: null, logoutReason: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loggedIn(state, action: PayloadAction<Session>) {
      state.session = action.payload;
      state.logoutReason = null;
    },
    /** "user" = clicked Log out. "expired" = the server answered 401 (see apiSlice.ts). */
    loggedOut(state, action: PayloadAction<LogoutReason>) {
      state.session = null;
      state.logoutReason = action.payload;
    },
  },
});

export const { loggedIn, loggedOut } = authSlice.actions;
export const authReducer = authSlice.reducer;

export const selectSession = (state: RootState) => state.auth.session;
export const selectCurrentUser = (state: RootState) => state.auth.session?.user ?? null;
export const selectAuthToken = (state: RootState) => state.auth.session?.token ?? null;
export const selectIsLoggedIn = (state: RootState) => state.auth.session !== null;
export const selectLogoutReason = (state: RootState) => state.auth.logoutReason;
