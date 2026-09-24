import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getToken, setToken } from './api';
import type { Account } from './types';

interface AuthValue {
  ready: boolean;
  user: Account | null;
  unread: number;
  setSession: (token: string, user: Account) => void;
  logout: () => void;
  refreshUnread: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [ready, setReady] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    if (!getToken()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then((account) => {
        if (active) setUser(account);
      })
      .catch(() => {
        setToken(null);
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const refreshUnread = useCallback(async () => {
    if (!getToken()) {
      setUnread(0);
      return;
    }
    try {
      const data = await api.notifications();
      setUnread(data.unread);
    } catch {
      /* the bell can wait */
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    void refreshUnread();
    const timer = window.setInterval(() => void refreshUnread(), 20000);
    return () => window.clearInterval(timer);
  }, [user, refreshUnread]);

  const setSession = useCallback((token: string, account: Account) => {
    setToken(token);
    setUser(account);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setUnread(0);
  }, []);

  const value = useMemo(
    () => ({ ready, user, unread, setSession, logout, refreshUnread }),
    [ready, user, unread, setSession, logout, refreshUnread],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
