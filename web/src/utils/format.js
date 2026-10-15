const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num1 = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function formatINR(value, precise = false) {
  return (precise ? inr2 : inr0).format(Number(value) || 0);
}

/** "₹14/kg", "₹38.50/kg" */
export function formatRate(value, unit = 'KG') {
  const n = Number(value) || 0;
  return `${formatINR(n, !Number.isInteger(n))}/${String(unit || 'KG').toLowerCase()}`;
}

export const formatKg = (v) => `${num1.format(Number(v) || 0)} kg`;
export const formatNumber = (v) => num1.format(Number(v) || 0);

/** Local (IST-safe) YYYY-MM-DD */
export function localISO(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDate(value) {
  if (typeof value === 'string' && value.length === 10) return new Date(`${value}T00:00:00`);
  return new Date(value);
}

export function formatDate(value) {
  if (!value) return '—';
  return toDate(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDay(value) {
  if (!value) return '—';
  const iso = typeof value === 'string' && value.length === 10 ? value : localISO(value);
  if (iso === localISO()) return 'Today';
  if (iso === localISO(addDays(new Date(), 1))) return 'Tomorrow';
  return toDate(value).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatTime(value) {
  return value ? new Date(value).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '';
}

export const formatDateTime = (value) => (value ? `${formatDate(value)}, ${formatTime(value)}` : '—');

export function isToday(value) {
  if (!value) return false;
  const iso = typeof value === 'string' && value.length === 10 ? value : localISO(value);
  return iso === localISO();
}

/** Approximate kg CO2e avoided per kg recycled versus virgin production (indicative factors). */
export const CO2_FACTORS = { NON_FERROUS: 4.5, FERROUS: 1.6, PAPER: 0.9, PLASTIC: 1.5, E_WASTE: 2.2, MIXED: 1.2 };
export const co2ForKg = (kg, group) => (Number(kg) || 0) * (CO2_FACTORS[group] ?? 1.2);
export const BLENDED_CO2_FACTOR = 1.4;
