// Logging out, in one place (used by the header and the account page).
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/apiSlice";
import { loggedOut } from "../store/authSlice";
import { useAppDispatch } from "../store/hooks";

export function useLogout() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return useCallback(() => {
    dispatch(loggedOut("user")); // clears the session (and the token in sessionStorage)
    // Forget cached server data, so the next person on this computer can't see this user's
    // private data (orders, account). Public data like products is simply fetched again.
    dispatch(api.util.resetApiState());
    navigate("/");
  }, [dispatch, navigate]);
}
