import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, connection, ratesApi, resetDemoData, sessionStore } from '../services/api';

const AppContext = createContext(null);
const VIEW_KEY = 'sg_view';

/** Demo views offered by the role switcher, and the account each one signs into. */
export const VIEWS = {
  customer: { label: 'Customer', loginAs: 'CUSTOMER', home: '/' },
  b2b: { label: 'B2B corporate', loginAs: 'CORPORATE', home: '/b2b' },
  admin: { label: 'Admin yard', loginAs: 'ADMIN', home: '/admin' },
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

  const signIn = useCallback(async (loginAs) => {
    // De-duplicate concurrent sign-ins (StrictMode, fast clicks)
    if (pendingLogin.current?.loginAs === loginAs) return pendingLogin.current.promise;
    const promise = authApi.demoLogin(loginAs).then((auth) => {
      setSession({ token: auth.token, user: auth.user, role: auth.role });
      return auth;
    }).finally(() => { pendingLogin.current = null; });
    pendingLogin.current = { loginAs, promise };
    return promise;
  }, []);

  /** Make sure a session matching the current demo view exists (used by protected pages). */
  const ensureSession = useCallback(async () => {
    const wanted = VIEWS[view].loginAs;
    const current = sessionStore.get();
    const matches = current && (wanted === 'ADMIN' ? current.role === 'ADMIN' : current.role === 'CUSTOMER');
    if (matches) return current;
    return signIn(wanted);
  }, [signIn, view]);

  const switchView = useCallback(async (next) => {
    if (!VIEWS[next]) return;
    setSwitching(true);
    setView(next);
    try { localStorage.setItem(VIEW_KEY, next); } catch { /* ignore */ }
    try {
      authApi.logout();
      await signIn(VIEWS[next].loginAs);
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
    await signIn(VIEWS[view].loginAs);
    await refreshRates();
    notify('Demo data reset to the starting state.');
  }, [notify, refreshRates, signIn, view]);

  // Bootstrap: load rates and make sure the demo view has a session.
  useEffect(() => {
    refreshRates();
    ensureSession().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setSession(null);
      signIn(VIEWS[view].loginAs).catch(() => {});
    };
    window.addEventListener('sg:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sg:unauthorized', onUnauthorized);
  }, [signIn, view]);

  const value = useMemo(() => ({
    view, switchView, switching, session, ensureSession, connectionMode,
    rates, ratesLoading, refreshRates, notify, toasts, resetDemo,
  }), [view, switchView, switching, session, ensureSession, connectionMode, rates, ratesLoading, refreshRates, notify, toasts, resetDemo]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
