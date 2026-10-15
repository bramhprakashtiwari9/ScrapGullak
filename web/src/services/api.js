/**
 * ScrapGullak API client.
 *
 * - Axios instance pointed at the Spring Boot backend (VITE_API_URL, default http://localhost:8080/api/v1).
 * - JWT request interceptor + 401 handling.
 * - Every call goes through `call()`, which falls back to the in-browser mock backend (mockStore.js)
 *   only in explicit public-demo mode. Real-account mode reports API/network failures.
 */
import axios from 'axios';
import { mock, resetMockState } from './mockStore';
import { ApiError } from './errors';

export { ApiError };
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const env = import.meta.env;
export const IS_PUBLIC_DEMO = env.VITE_PUBLIC_DEMO === 'true';

// ---------------------------------------------------------------- session storage
const TOKEN_KEY = 'sg_token';
const USER_KEY = 'sg_user';

export const sessionStore = {
  get() {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
      return token && user ? { token, user, role: user.role } : null;
    } catch { return null; }
  },
  set({ token, user }) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch { /* ignore */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
  },
  token() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
};

export const isMockToken = (t) => typeof t === 'string' && t.startsWith('mock.');

// ---------------------------------------------------------------- axios + interceptors
export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = sessionStore.token();
  if (token && !isMockToken(token)) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/')) {
      sessionStore.clear();
      window.dispatchEvent(new CustomEvent('sg:unauthorized'));
    }
    return Promise.reject(error);
  },
);

// ---------------------------------------------------------------- connection status
let mode = 'unknown'; // 'online' | 'offline' | 'unknown'
let lastOfflineAt = 0;
const RETRY_AFTER_MS = 20000;
const listeners = new Set();

export const connection = {
  get mode() { return mode; },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};
function setMode(next) {
  if (next === 'offline') lastOfflineAt = Date.now();
  if (next !== mode) { mode = next; listeners.forEach((fn) => fn(next)); }
}

const isNetworkError = (e) => !e?.response; // refused, CORS, DNS, timeout
const unwrap = (res) => {
  const body = res?.data;
  return body && typeof body === 'object' && 'data' in body && ('success' in body || 'message' in body) ? body.data : body;
};
const asArray = (d) => (Array.isArray(d) ? d : d?.content || d?.items || d?.data || []);

function toApiError(e) {
  const d = e.response?.data;
  const fieldErr = d?.fieldErrors || d?.errors;
  const firstField = fieldErr && typeof fieldErr === 'object' ? Object.values(fieldErr)[0] : null;
  const message = d?.message || d?.detail || (typeof firstField === 'string' ? firstField : null) || d?.error
    || (e.response?.status === 403 ? 'You do not have access to this action.' : 'Something went wrong on the server. Try again.');
  return new ApiError(message, e.response?.status, d);
}

/**
 * @param request   () => axios promise against the real backend
 * @param fallback  () => mock promise
 * @param auth      endpoint needs a JWT; with a demo (mock) session we go straight to the mock
 */
async function call({ request, fallback, auth = true }) {
  if (IS_PUBLIC_DEMO) return fallback();
  if (auth && isMockToken(sessionStore.token())) {
    sessionStore.clear();
    window.dispatchEvent(new CustomEvent('sg:unauthorized'));
    throw new ApiError('Please sign in with a real account to continue.', 401);
  }
  if (mode === 'offline' && Date.now() - lastOfflineAt < RETRY_AFTER_MS) {
    throw new ApiError('The ScrapGullak server is not reachable. Please try again when the service is online.', 0);
  }
  try {
    const res = await request();
    setMode('online');
    return unwrap(res);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (isNetworkError(e)) {
      setMode('offline');
      if (IS_PUBLIC_DEMO) return fallback();
      throw new ApiError('The ScrapGullak server is not reachable. Please try again when the service is online.', 0);
    }
    throw toApiError(e);
  }
}

// ---------------------------------------------------------------- normalizers
const normalizeRole = (r) => String(r || '').replace(/^ROLE_/, '').toUpperCase();

function normalizeAuth(d) {
  const user = d.user || d.userDetails || { ...d };
  const role = normalizeRole(d.role || user.role);
  return { token: d.token || d.accessToken || d.jwt, user: { ...user, role }, role, passbook: d.passbook || d.gullakPassbook || null };
}

function normalizeEstimate(d) {
  return {
    items: d.items || d.lines || [],
    totalWeightKg: Number(d.totalWeightKg ?? 0),
    totalEstimatedPayoutInr: Number(d.totalEstimatedPayoutInr ?? d.estimatedPayoutInr ?? d.totalPayoutInr ?? d.total ?? 0),
  };
}

function normalizePassbook(d) {
  return {
    gullakTotalEarnings: Number(d.gullakTotalEarnings ?? d.totalEarnings ?? 0),
    totalRecycledKg: Number(d.totalRecycledKg ?? 0),
    co2SavedKg: d.co2SavedKg != null ? Number(d.co2SavedKg) : Math.round(Number(d.totalRecycledKg ?? 0) * 1.4),
    totalPickups: d.totalPickups ?? asArray(d.transactions).length,
    transactions: asArray(d.transactions),
  };
}

function persist(auth) {
  sessionStore.set(auth);
  return auth;
}

// ---------------------------------------------------------------- endpoints
export const authApi = {
  async login(phone, password) {
    if (IS_PUBLIC_DEMO) throw new ApiError('Sign-in is unavailable in the public demo.', 403);
    try {
      const res = await http.post('/auth/login', { phone, password });
      setMode('online');
      return persist(normalizeAuth(unwrap(res)));
    } catch (e) {
      if (isNetworkError(e)) setMode('offline');
      throw isNetworkError(e) ? new ApiError('The ScrapGullak server is not reachable.', 0) : toApiError(e);
    }
  },

  async register(payload) {
    if (IS_PUBLIC_DEMO) throw new ApiError('Registration is unavailable in the public demo.', 403);
    try {
      const res = await http.post('/auth/register', payload);
      setMode('online');
      return persist(normalizeAuth(unwrap(res)));
    } catch (e) {
      throw isNetworkError(e) ? new ApiError('The ScrapGullak server is not reachable.', 0) : toApiError(e);
    }
  },

  /** Uses configured local demo accounts when available; otherwise uses the mock session. */
  async demoLogin(roleKey) {
    if (!IS_PUBLIC_DEMO) throw new ApiError('Demo sign-in is disabled.', 403);
    const auth = normalizeAuth(await mock.login(roleKey));
    return persist(auth);
  },

  logout() { sessionStore.clear(); },
};

export const ratesApi = {
  live: () => call({ auth: false, request: () => http.get('/rates/live'), fallback: () => mock.liveRates() }).then(asArray),
  estimate: (items) => call({
    auth: false,
    request: () => http.post('/rates/estimate', { items }),
    fallback: () => mock.estimate(items),
  }).then(normalizeEstimate),
};

export const customerApi = {
  createPickup: (payload) => call({
    // TODO: upload photos to object storage (S3 / Cloudinary) and send the URL; data URLs stay in demo mode.
    request: () => http.post('/customer/pickups', { ...payload, photoUrl: payload.photoUrl?.startsWith('data:') ? null : payload.photoUrl }),
    fallback: () => mock.createPickup(payload),
  }),
  myPickups: () => call({ request: () => http.get('/customer/pickups'), fallback: () => mock.myPickups() }).then(asArray),
  passbook: () => call({ request: () => http.get('/customer/gullak-passbook'), fallback: () => mock.passbook() }).then(normalizePassbook),
};

export const b2bApi = {
  /** Corporate tender / bulk pickup = an INDUSTRIAL_B2B pickup order with company details attached. */
  requestBulkPickup: (form) => customerApi.createPickup({
    orderType: 'INDUSTRIAL_B2B',
    noidaSector: form.zone,
    fullAddress: form.siteAddress,
    scheduledDate: form.preferredDate,
    timeSlot: '8 – 11 AM',
    estimatedWeightRange: form.monthlyVolume,
    scrapGroups: form.materials,
    companyName: form.companyName,
    contactPhone: form.phone,
    notes: [`${form.requestType} | ${form.frequency}`, form.notes].filter(Boolean).join(' | '),
    corporateDetails: {
      companyName: form.companyName, gstNumber: form.gstNumber || null, contactName: form.contactName,
      phone: form.phone, email: form.email, requestType: form.requestType, frequency: form.frequency,
    },
  }),
};

export const agentApi = {
  assigned: () => call({ request: () => http.get('/agent/pickups/assigned'), fallback: () => mock.assignedPickups() }).then(asArray),
  completeWeighing: (orderId, payload) => call({
    request: () => http.post(`/agent/pickups/${orderId}/complete-weighing`, payload),
    fallback: () => mock.completeWeighing(orderId, payload),
  }),
};

export const adminApi = {
  /** Full rate card incl. mill selling rates (the public /rates/live hides mill rates from non-admins). */
  rates: () => call({ request: () => http.get('/admin/rates'), fallback: () => mock.liveRates() }).then(asArray),
  updateRate: (categoryId, payload) => call({ request: () => http.put(`/admin/rates/${categoryId}`, payload), fallback: () => mock.updateRate(categoryId, payload) }),
  assignAgent: (orderId, agentId) => call({ request: () => http.patch(`/admin/pickups/${orderId}/assign/${agentId}`), fallback: () => mock.assignAgent(orderId, agentId) }),
  processInventory: (payload) => call({ request: () => http.post('/admin/inventory/process', payload), fallback: () => mock.processInventory(payload) }),
  metrics: () => call({ request: () => http.get('/admin/dashboard/metrics'), fallback: () => mock.metrics() }),
  // Supporting list endpoints for the admin screens (add to AdminController if not present yet).
  pickups: () => call({ request: () => http.get('/admin/pickups'), fallback: () => mock.allPickups() }).then(asArray),
  agents: () => call({ request: () => http.get('/admin/agents'), fallback: () => mock.agents() }).then(asArray),
  inventory: () => call({ request: () => http.get('/admin/inventory'), fallback: () => mock.inventory() }).then(asArray),
};

export function resetDemoData() {
  resetMockState();
}
