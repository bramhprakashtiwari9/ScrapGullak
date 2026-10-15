import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, connection, IS_PUBLIC_DEMO, ratesApi, resetDemoData, sessionStore } from '../services/api';
import { ApiError } from '../services/errors';

const AppContext = createContext(null);
const VIEW_KEY = 'sg_view';

export const VIEWS = {
  customer: { label: 'Customer', loginAs: 'CUSTOMER', home: '/' },
  b2b: { label: 'B2B corporate', loginAs: 'CORPORATE', home: '/b2b' },
  admin: { label: 'Admin yard', loginAs: 'ADMIN', home: '/admin' },
  agent: { label: 'Pickup agent', loginAs: 'AGENT', home: '/agent' },
};

function readView() {
  try { return VIEWS[localStorage.getItem(VIEW_KEY)] ? localStorage.getItem(VIEW_KEY) : 'customer'; } catch { return 'customer'; }
}

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const [view, setView] = useState(readView);
  const [session, setSession] = useState(() => sessionStore.get());
  const [connectionMode, setConnectionMode] = useState(connection.mode);
  const [rates, setRates] = useState([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [switching, setSwitching] = useState(false);
  const pendingLogin = useRef(null);

  useEffect(() => connection.subscribe(setConnectionMode), []);

  const notify = useCallback((message, tone = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const refreshRates = useCallback(async () => {
    try {
      setRates(await ratesApi.live());
    } catch (e) {
      notify(e.message || 'Could not load today’s rates.', 'error');
    } finally {
      setRatesLoading(false);
    }
  }, [notify]);

  const signIn = useCallback(async (phone, password, expectedRole) => {
    if (pendingLogin.current?.phone === phone) return pendingLogin.current.promise;
    const promise = (IS_PUBLIC_DEMO
      ? authApi.demoLogin(expectedRole === 'STAFF' ? 'ADMIN' : expectedRole || 'CUSTOMER')
      : authApi.login(phone, password)
    ).then((auth) => {
      if (!IS_PUBLIC_DEMO && expectedRole === 'CUSTOMER' && auth.role !== 'CUSTOMER') {
        authApi.logout();
        throw new ApiError('This account is for staff. Use the staff sign-in option.', 403);
      }
      if (!IS_PUBLIC_DEMO && expectedRole === 'STAFF' && !['ADMIN', 'AGENT'].includes(auth.role)) {
        authApi.logout();
        throw new ApiError('This is a customer account. Use customer sign-in.', 403);
      }
      setSession({ token: auth.token, user: auth.user, role: auth.role });
      return auth;
    }).finally(() => { pendingLogin.current = null; });
    pendingLogin.current = { phone, promise };
    return promise;
  }, []);

  const register = useCallback(async (payload) => {
    const auth = await authApi.register(payload);
    if (auth.role !== 'CUSTOMER') {
      authApi.logout();
      throw new ApiError('Customer registration did not return a customer account.', 403);
    }
    setSession({ token: auth.token, user: auth.user, role: auth.role });
    return auth;
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setSession(null);
  }, []);

  const ensureSession = useCallback(async (role) => {
    const current = sessionStore.get();
    if (current && (!role || current.role === role)) return current;
    if (IS_PUBLIC_DEMO && !current) {
      const demo = await authApi.demoLogin(role === 'ADMIN' ? 'ADMIN' : 'CUSTOMER');
      setSession({ token: demo.token, user: demo.user, role: demo.role });
      return demo;
    }
    throw new ApiError('Sign in to continue.', 401);
  }, []);

  const switchView = useCallback(async (next) => {
    if (!VIEWS[next] || !IS_PUBLIC_DEMO) return;
    setSwitching(true);
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* ignore */ }
    try {
      authApi.logout();
      await signIn(null, null, VIEWS[next].loginAs);
      navigate(VIEWS[next].home);
    } catch (e) {
      notify(e.message || 'Could not switch view.', 'error');
    } finally {
      setSwitching(false);
    }
  }, [navigate, notify, signIn]);

  const resetDemo = useCallback(async () => {
    resetDemoData();
    authApi.logout();
    await signIn(null, null, VIEWS[view].loginAs);
    await refreshRates();
    notify('Demo data reset to the starting state.');
  }, [notify, refreshRates, signIn, view]);

  // Public rates are available before sign-in; only the public demo creates a mock session.
  useEffect(() => {
    refreshRates();
    if (IS_PUBLIC_DEMO) ensureSession().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setSession(null);
    };
    window.addEventListener('sg:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sg:unauthorized', onUnauthorized);
  }, [signIn, view]);

  const value = useMemo(() => ({
    view, switchView, switching, session, signIn, register, logout, ensureSession, connectionMode,
    rates, ratesLoading, refreshRates, notify, toasts, resetDemo,
  }), [view, switchView, switching, session, signIn, register, logout, ensureSession, connectionMode, rates, ratesLoading, refreshRates, notify, toasts, resetDemo]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
