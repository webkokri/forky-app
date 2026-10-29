import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, onSignedOut, tokens, type LoginResult, type User } from '@/api';

type AuthState = {
  user: User | null;
  ready: boolean;
  login: (identifier: string, password: string) => Promise<LoginResult>;
  verify2fa: (tempToken: string, code: string) => Promise<void>;
  /** Resolves true when the account was signed in straight away (false = verify/sign in next). */
  register: (body: Record<string, unknown>) => Promise<boolean>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      await tokens.load();
      if (tokens.access) {
        try { const me = await api.me(); if (live) setUser(me); } catch { await tokens.clear(); }
      }
      if (live) setReady(true);
    })();
    const off = onSignedOut(() => setUser(null));
    return () => { live = false; off(); };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    const res = await api.login(identifier, password);
    if (res.step === 'done') setUser(res.user);
    return res;
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    ready,
    login,
    verify2fa: async (t, code) => setUser(await api.verify2fa(t, code)),
    register: async (body) => { const u = await api.register(body); if (u) setUser(u); return !!u; },
    logout: async () => { await api.logout(); setUser(null); },
  }), [user, ready, login]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
