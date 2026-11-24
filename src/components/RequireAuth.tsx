// Protects a route: logged-out users are sent to /login, remembering where they wanted to go,
// so they come straight back after logging in. Used in App.tsx for /checkout and /account.
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { selectIsLoggedIn } from "../store/authSlice";
import { useAppSelector } from "../store/hooks";

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const isLoggedIn = useAppSelector(selectIsLoggedIn);
  const location = useLocation();

  if (!isLoggedIn) {
    // replace: the protected URL isn't kept in history, so Back doesn't bounce to /login again.
    return (
      <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
    );
  }
  return <>{children}</>;
}
