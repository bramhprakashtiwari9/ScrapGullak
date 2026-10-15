import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { ApiError } from '../services/errors';
import { authApi, connection, IS_PUBLIC_DEMO, ratesApi, sessionStore, setUnauthorizedHandler, isMockToken, type ConnectionMode } from '../services/api';
import type { AuthResult, RegisterPayload, ScrapCategory } from '../types';

export type AppMode = 'customer' | 'agent';
type SignInMode = AppMode | 'admin';

interface AppState {
  ready: boolean;
  mode: AppMode;
  switchMode: (m: AppMode) => Promise<void>;
  switching: boolean;
  session: AuthResult | null;
  signIn: (phone: string, password: string, mode: SignInMode) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  logout: () => Promise<void>;
  ensureSession: () => Promise<AuthResult>;
  connectionMode: ConnectionMode;
  demoData: boolean;
  rates: ScrapCategory[];
  refreshRates: () => Promise<void>;
  sector: string;
  setSector: (s: string) => void;
}

const Ctx = createContext<AppState | null>(null);
const roleFor = (m: SignInMode) => (m === 'agent' ? 'AGENT' : m === 'admin' ? 'ADMIN' : 'CUSTOMER') as AuthResult['role'];

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<AppMode>('customer');
  const [switching, setSwitching] = useState(false);
  const [session, setSession] = useState<AuthResult | null>(null);
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(connection.mode);
  const [rates, setRates] = useState<ScrapCategory[]>([]);
  const [sector, setSector] = useState('Sector 74');

  useEffect(() => connection.subscribe(setConnectionMode), []);

  const refreshRates = useCallback(async () => {
    try { setRates(await ratesApi.live()); } catch { /* keep last known rates */ }
  }, []);

  const signIn = useCallback(async (phone: string, password: string, m: SignInMode) => {
    if (IS_PUBLIC_DEMO && m === 'admin') throw new ApiError('Administrator sign-in is unavailable in the public demo.', 403);
    const auth = IS_PUBLIC_DEMO
      ? await authApi.demoLogin(m === 'agent' ? 'AGENT' : 'CUSTOMER')
      : await authApi.login(phone, password);
    if (!IS_PUBLIC_DEMO && auth.role !== roleFor(m)) {
      await authApi.logout();
      throw new ApiError(m === 'agent' ? 'This account is not a pickup agent account.' : m === 'admin' ? 'This account is not an administrator account.' : 'This account is not a customer account.', 403);
    }
    setSession(auth);
    setMode(auth.role === 'AGENT' ? 'agent' : 'customer');
    if (auth.user.noidaSector && auth.role === 'CUSTOMER') setSector(auth.user.noidaSector);
    return auth;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const auth = await authApi.register(payload);
    if (auth.role !== 'CUSTOMER') {
      await authApi.logout();
      throw new ApiError('Customer registration did not return a customer account.', 403);
    }
    setSession(auth);
    setMode('customer');
    if (auth.user.noidaSector) setSector(auth.user.noidaSector);
    return auth;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setSession(null);
    router.replace('/login');
  }, [router]);

  const ensureSession = useCallback(async () => {
    const s = sessionStore.get();
    if (s && s.role === roleFor(mode)) return s;
    if (IS_PUBLIC_DEMO && !s) return signIn('', '', mode);
    throw new ApiError('Sign in to continue.', 401);
  }, [mode, signIn]);

  const switchMode = useCallback(async (next: AppMode) => {
    if (next === mode || !IS_PUBLIC_DEMO) return;
    setSwitching(true);
    try {
      await authApi.logout();
      // Sign in before flipping the mode: flipping first re-runs the focused screen's loader, which
      // signs in a second time and calls the old role's endpoints with the new token (403s).
      await signIn('', '', next);
      setMode(next);
      router.replace(next === 'agent' ? '/agent' : '/customer');
    } finally {
      setSwitching(false);
    }
  }, [mode, router, signIn]);

  // Bootstrap: restore a real session or sign in to the demo customer, and load rates.
  useEffect(() => {
    (async () => {
      const restored = await sessionStore.hydrate();
      if (restored) {
        setSession(restored);
        setMode(restored.role === 'AGENT' ? 'agent' : 'customer');
        if (restored.user.noidaSector) setSector(restored.user.noidaSector);
      } else if (IS_PUBLIC_DEMO) {
        await signIn('', '', 'customer').catch(() => undefined);
      }
      await refreshRates();
      setReady(true);
    })();
  }, [refreshRates, signIn]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSession(null);
      router.replace('/login');
    });
  }, [router]);

  useEffect(() => {
    if (!ready) return;
    const group = segments[0];
    if (!session) {
      if (group === 'customer' || group === 'agent' || group === 'admin') router.replace('/login');
      return;
    }
    const home = session.role === 'AGENT' ? '/agent' : session.role === 'ADMIN' ? '/admin' : '/customer';
    if (group === 'login') router.replace(home);
    else if (group === 'customer' && session.role !== 'CUSTOMER') router.replace(home);
    else if (group === 'agent' && session.role !== 'AGENT') router.replace(home);
    else if (group === 'admin' && session.role !== 'ADMIN') router.replace(home);
  }, [ready, session, segments, router]);

  const value = useMemo<AppState>(() => ({
    ready, mode, switchMode, switching, session, signIn, register, logout, ensureSession, connectionMode,
    demoData: isMockToken(session?.token),
    rates, refreshRates, sector, setSector,
  }), [ready, mode, switchMode, switching, session, signIn, register, logout, ensureSession, connectionMode, rates, refreshRates, sector]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
