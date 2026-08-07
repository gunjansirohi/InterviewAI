import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getProfile, loginUser, registerUser } from './authService';

const TOKEN_KEY = 'interviewai_token';
const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restoreSession() {
      if (!localStorage.getItem(TOKEN_KEY)) {
        setIsLoading(false);
        return;
      }
      try {
        setUser(await getProfile());
      } catch {
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const persistSession = (data) => {
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (credentials) => persistSession(await loginUser(credentials));
  const register = async (details) => persistSession(await registerUser(details));
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };
  const updateUser = useCallback((profile) => setUser((current) => ({ ...current, ...profile })), []);

  const value = useMemo(() => ({ user, isAuthenticated: Boolean(user), isLoading, login, register, logout, updateUser }), [user, isLoading, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
