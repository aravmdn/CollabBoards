import { useCallback, useEffect, useState } from 'react';
import { api, setAccessToken } from '../lib/api';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthState {
  tokens: AuthTokens | null;
  isLoading: boolean;
  error: string | null;
}

const ACCESS_TOKEN_KEY = 'cb_access_token';
const REFRESH_TOKEN_KEY = 'cb_refresh_token';

const loadTokens = (): AuthTokens | null => {
  if (typeof window === 'undefined') return null;
  const access = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (access && refresh) {
    return { accessToken: access, refreshToken: refresh };
  }
  return null;
};

const persistTokens = (tokens: AuthTokens | null) => {
  if (typeof window === 'undefined') return;
  if (tokens) {
    localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    setAccessToken(tokens.accessToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAccessToken(null);
  }
};

export const useAuth = () => {
  const [state, setState] = useState<AuthState>({
    tokens: loadTokens(),
    isLoading: false,
    error: null,
  });

  useEffect(() => {
    if (state.tokens?.accessToken) {
      setAccessToken(state.tokens.accessToken);
    }
  }, [state.tokens]);

  const login = useCallback(async (email: string, password: string) => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const { data } = await api.post<AuthTokens>('/auth/login', {
        email,
        password,
      });
      persistTokens(data);
      setState({ tokens: data, isLoading: false, error: null });
      return data;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || 'Login failed';
      setState((s) => ({
        ...s,
        isLoading: false,
        error: message,
      }));
      throw err;
    }
  }, []);

  const register = useCallback(
    async (email: string, password: string, name?: string) => {
      setState((s) => ({ ...s, isLoading: true, error: null }));
      try {
        const { data } = await api.post<AuthTokens>('/auth/register', {
          email,
          password,
          name,
        });
        persistTokens(data);
        setState({ tokens: data, isLoading: false, error: null });
        return data;
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || 'Registration failed';
        setState((s) => ({
          ...s,
          isLoading: false,
        error: message,
        }));
        throw err;
      }
    },
    [],
  );

  const logout = useCallback(() => {
    persistTokens(null);
    setState({ tokens: null, isLoading: false, error: null });
  }, []);

  const refresh = useCallback(async () => {
    const refreshToken =
      typeof window !== 'undefined'
        ? localStorage.getItem(REFRESH_TOKEN_KEY)
        : null;
    if (!refreshToken) return null;
    try {
      const { data } = await api.post<AuthTokens>('/auth/refresh', {
        refreshToken,
      });
      persistTokens(data);
      setState({ tokens: data, isLoading: false, error: null });
      return data;
    } catch {
      logout();
      return null;
    }
  }, [logout]);

  return {
    tokens: state.tokens,
    isAuthenticated: !!state.tokens?.accessToken,
    isLoading: state.isLoading,
    error: state.error,
    login,
    register,
    logout,
    refresh,
  };
};


