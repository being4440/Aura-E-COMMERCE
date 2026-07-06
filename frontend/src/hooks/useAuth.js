import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import { setUser, clearUser, updateUserData } from '../store/authSlice';

/**
 * useAuth — unified auth hook backed by Redux authSlice.
 *
 * Returns:
 *   user          — the logged-in user object (or null)
 *   token         — the JWT string (or null)
 *   isAuthenticated — boolean
 *   login(user, token)  — dispatch setUser + syncs localStorage
 *   logout()            — dispatch clearUser + clears localStorage
 *   updateUser(data)    — dispatch updateUserData (for profile edits)
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, token, isAuthenticated } = useSelector((state) => state.auth);

  const login = useCallback(
    (userData, authToken) => {
      dispatch(setUser({ user: userData, token: authToken }));
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    dispatch(clearUser());
  }, [dispatch]);

  const updateUser = useCallback(
    (updatedData) => {
      dispatch(updateUserData(updatedData));
    },
    [dispatch]
  );

  return { user, token, isAuthenticated, login, logout, updateUser };
};
