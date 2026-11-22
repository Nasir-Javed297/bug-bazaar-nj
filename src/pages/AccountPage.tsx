// Route "/account" (protected by RequireAuth).
// Asks the server who we are (GET /api/me). If the token has expired, the server answers 401,
// the base query clears the session, and RequireAuth sends the user to /login.
import { useGetMeQuery } from "../api/apiSlice";
import { toRequestState } from "../api/requestState";
import { QueryStateView } from "../components/QueryStateView";
import { useLogout } from "../hooks/useLogout";

export function AccountPage() {
  const result = useGetMeQuery();
  const logout = useLogout();

  return (
    <div className="page">
      <h1>Your account</h1>
      <QueryStateView
        state={toRequestState(result)}
        loadingLabel="Loading your account…"
        errorTitle="We couldn't load your account"
        onRetry={() => void result.refetch()}
      >
        {(user) => (
          <section className="account">
            <dl>
              <dt>Name</dt>
              <dd>{user.name}</dd>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </dl>
            <button type="button" className="button button--secondary" onClick={logout}>
              Log out
            </button>
          </section>
        )}
      </QueryStateView>
    </div>
  );
}
