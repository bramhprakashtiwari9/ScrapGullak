/**
 * ScrapGullak mobile API client.
 * Axios → Spring Boot /api/v1 with a JWT interceptor. Mock data is used only in explicit demo mode;
 * a real account reports API/network failures rather than silently switching to sample data.
 */
import axios, { AxiosError, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { AuthResult, CreatePickupPayload, Estimate, Passbook, PassbookTxn, PickupOrder, RegisterPayload, Role, ScrapCategory, User, WeighingPayload } from '../types';
import { mock, resetMock } from './mockStore';
import { ApiError } from './errors';

export { ApiError };

function resolveBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  // Expo Go on a phone: the dev server's LAN IP is the machine running Spring Boot.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:8080/api/v1`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:8080/api/v1' : 'http://localhost:8080/api/v1';
}

export const API_BASE_URL = resolveBaseUrl();
export const IS_PUBLIC_DEMO = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

// ------------------------------------------------------------ session (memory + AsyncStorage)
const SESSION_KEY = 'scrapgullak.session';
let session: AuthResult | null = null;

export const sessionStore = {
  get: () => session,
  async hydrate(): Promise<AuthResult | null> {
    try {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      session = raw ? (JSON.parse(raw) as AuthResult) : null;
      // Mock sessions don't survive an app restart (mock data lives in memory).
      if (session && isMockToken(session.token)) session = null;
    } catch { session = null; }
    return session;
  },
  async set(next: AuthResult) {
    session = next;
    try { await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  },
  async clear() {
    session = null;
    try { await AsyncStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  },
};

export const isMockToken = (t?: string | null) => !!t && t.startsWith('mock.');

// ------------------------------------------------------------ axios
export const http = axios.create({ baseURL: API_BASE_URL, timeout: 4000, headers: { 'Content-Type': 'application/json', Accept: 'application/json' } });

http.interceptors.request.use((config) => {
  const token = session?.token;
  if (token && !isMockToken(token)) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

http.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      await sessionStore.clear();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

// ------------------------------------------------------------ connection status
export type ConnectionMode = 'unknown' | 'online' | 'offline';
let mode: ConnectionMode = 'unknown';
let lastOfflineAt = 0;
const listeners = new Set<(m: ConnectionMode) => void>();
export const connection = {
  get mode() { return mode; },
  subscribe(fn: (m: ConnectionMode) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
};
function setMode(next: ConnectionMode) {
  if (next === 'offline') lastOfflineAt = Date.now();
  if (next !== mode) { mode = next; listeners.forEach((fn) => fn(next)); }
}

const isNetworkError = (e: unknown) => axios.isAxiosError(e) && !e.response;

function unwrap<T>(res: AxiosResponse): T {
  const body = res.data;
  if (body && typeof body === 'object' && 'data' in body && ('success' in body || 'message' in body)) return body.data as T;
  return body as T;
}
const asArray = <T,>(d: unknown): T[] => (Array.isArray(d) ? d : ((d as { content?: T[] })?.content ?? []));

function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  if (axios.isAxiosError(e)) {
    const d = e.response?.data as { message?: string; error?: string } | undefined;
    return new ApiError(d?.message ?? d?.error ?? 'The server could not complete that. Try again.', e.response?.status ?? 0);
  }
  return new ApiError((e as Error)?.message ?? 'Something went wrong.');
}

async function call<T>(request: () => Promise<AxiosResponse>, fallback: () => Promise<T>, auth = true): Promise<T> {
  if (IS_PUBLIC_DEMO) return fallback();
  if (auth && isMockToken(session?.token)) {
    await sessionStore.clear();
    onUnauthorized?.();
    throw new ApiError('Please sign in with a real account to continue.', 401);
  }
  if (mode === 'offline' && Date.now() - lastOfflineAt < 20000) {
    throw new ApiError('The ScrapGullak server is not reachable. Please try again when the service is online.', 0);
  }
  try {
    const res = await request();
    setMode('online');
    return unwrap<T>(res);
  } catch (e) {
    if (isNetworkError(e)) {
      setMode('offline');
      if (IS_PUBLIC_DEMO) return fallback();
      throw new ApiError('The ScrapGullak server is not reachable. Please try again when the service is online.', 0);
    }
    throw toApiError(e);
  }
}

const normalizeRole = (r: unknown): Role => String(r ?? '').replace(/^ROLE_/, '').toUpperCase() as Role;

// ------------------------------------------------------------ endpoints
export const authApi = {
  async login(phone: string, password: string): Promise<AuthResult> {
    try {
      const res = await http.post('/auth/login', { phone, password });
      const d = unwrap<Record<string, unknown>>(res);
      const user = ((d.user as User) ?? (d as unknown as User));
      const role = normalizeRole(d.role ?? user.role);
      const auth: AuthResult = { token: String(d.token ?? d.accessToken), user: { ...user, role }, role };
      setMode('online');
      await sessionStore.set(auth);
      return auth;
    } catch (e) {
      if (isNetworkError(e)) {
        setMode('offline');
        throw new ApiError('The ScrapGullak server is not reachable. Please try again when the service is online.', 0);
      }
      throw toApiError(e);
    }
  },

  async register(payload: RegisterPayload): Promise<AuthResult> {
    try {
      const res = await http.post('/auth/register', payload);
      const d = unwrap<Record<string, unknown>>(res);
      const user = ((d.user as User) ?? (d as unknown as User));
      const role = normalizeRole(d.role ?? user.role);
      const auth: AuthResult = { token: String(d.token ?? d.accessToken), user: { ...user, role }, role };
      setMode('online');
      await sessionStore.set(auth);
      return auth;
    } catch (e) {
      if (isNetworkError(e)) {
        setMode('offline');
        throw new ApiError('The ScrapGullak server is not reachable. Please try again when the service is online.', 0);
      }
      throw toApiError(e);
    }
  },

  async demoLogin(role: 'CUSTOMER' | 'AGENT'): Promise<AuthResult> {
    if (!IS_PUBLIC_DEMO) throw new ApiError('Demo sign-in is disabled.', 403);
    const auth = await mock.login(role);
    await sessionStore.set(auth);
    return auth;
  },

  logout: () => sessionStore.clear(),
};

export const ratesApi = {
  live: () => call<unknown>(() => http.get('/rates/live'), () => mock.liveRates(), false).then((d) => asArray<ScrapCategory>(d)),
  estimate: (items: { categoryId: number; weightKg: number }[]) =>
    call<Estimate>(() => http.post('/rates/estimate', { items }), () => mock.estimate(items), false),
};

export const customerApi = {
  // TODO: upload the photo (multipart) to object storage and send its URL. Local file URIs stay in demo mode.
  createPickup: (payload: CreatePickupPayload) => call<PickupOrder>(
    () => http.post('/customer/pickups', { ...payload, photoUrl: payload.photoUrl?.startsWith('http') ? payload.photoUrl : null }),
    () => mock.createPickup(payload),
  ),
  myPickups: () => call<unknown>(() => http.get('/customer/pickups'), () => mock.myPickups()).then((d) => asArray<PickupOrder>(d)),
  passbook: () => call<Passbook>(() => http.get('/customer/gullak-passbook'), () => mock.passbook()).then((p): Passbook => ({
    ...p,
    co2SavedKg: p.co2SavedKg ?? Math.round((p.totalRecycledKg ?? 0) * 1.4),
    transactions: asArray<PassbookTxn>(p.transactions),
  })),
};

export const agentApi = {
  assigned: () => call<unknown>(() => http.get('/agent/pickups/assigned'), () => mock.assignedPickups()).then((d) => asArray<PickupOrder>(d)),
  completeWeighing: (orderId: number, payload: WeighingPayload) => call<PickupOrder>(
    () => http.post(`/agent/pickups/${orderId}/complete-weighing`, payload),
    () => mock.completeWeighing(orderId, payload),
  ),
};

export const resetDemoData = () => resetMock();
