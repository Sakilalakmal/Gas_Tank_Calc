import axios from 'axios';
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  apiClient,
  LoginRequest,
  User,
} from '../services/api/apiClient';
import {
  registerUnauthorizedHandler,
  setAuthToken,
} from '../services/api/http';
import {
  clearAuthToken,
  loadAuthToken,
  saveAuthToken,
} from '../services/storage/authStorage';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  token: string | null;
  user: User | null;
};

type AuthContextValue = {
  status: AuthStatus;
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  signIn: (payload: LoginRequest) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toLoginErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return 'Invalid credentials';
    }

    if (!error.response) {
      return 'Cannot reach server';
    }
  }

  return 'Something went wrong';
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [authState, setAuthState] = useState<AuthState>({
    status: 'loading',
    token: null,
    user: null,
  });

  const applyUnauthenticatedState = useCallback(async () => {
    await clearAuthToken();
    setAuthToken(null);
    setAuthState({
      status: 'unauthenticated',
      token: null,
      user: null,
    });
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      // Best effort logout: local cleanup is mandatory.
    } finally {
      await applyUnauthenticatedState();
    }
  }, [applyUnauthenticatedState]);

  const handleUnauthorized = useCallback(async () => {
    await applyUnauthenticatedState();
  }, [applyUnauthenticatedState]);

  const signIn = useCallback(
    async (payload: LoginRequest) => {
      try {
        const response = await apiClient.login(payload);

        await saveAuthToken(response.token);
        setAuthToken(response.token);
        setAuthState({
          status: 'authenticated',
          token: response.token,
          user: response.user,
        });
      } catch (error) {
        throw new Error(toLoginErrorMessage(error));
      }
    },
    []
  );

  useEffect(() => {
    registerUnauthorizedHandler(handleUnauthorized);

    return () => {
      registerUnauthorizedHandler(null);
    };
  }, [handleUnauthorized]);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const token = await loadAuthToken();

        if (!isMounted) {
          return;
        }

        if (token) {
          setAuthToken(token);
          setAuthState({
            status: 'authenticated',
            token,
            user: null,
          });
          return;
        }

        setAuthState({
          status: 'unauthenticated',
          token: null,
          user: null,
        });
      } catch {
        if (isMounted) {
          setAuthToken(null);
          setAuthState({
            status: 'unauthenticated',
            token: null,
            user: null,
          });
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: authState.status,
      isAuthenticated: authState.status === 'authenticated',
      token: authState.token,
      user: authState.user,
      signIn,
      signOut,
    }),
    [authState.status, authState.token, authState.user, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
