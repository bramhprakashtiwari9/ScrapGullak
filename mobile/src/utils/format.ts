// Manual Indian digit grouping (1,23,456) so output is identical on Hermes, Android and iOS.
export function groupIndian(n: number, decimals = 0): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const last3 = int.slice(-3);
  const rest = int.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  return `${n < 0 ? '-' : ''}${grouped}${dec ? `.${dec}` : ''}`;
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function inr(value: number | null | undefined, decimals?: number): string {
  const n = Number(value) || 0;
  return `₹${groupIndian(n, decimals ?? (Number.isInteger(n) ? 0 : 2))}`;
}

export const rate = (value: number, unit = 'KG') => `${inr(value)}/${unit.toLowerCase()}`;

export function kg(value: number | null | undefined): string {
  const n = Number(value) || 0;
  return `${groupIndian(n, Number.isInteger(n) ? 0 : 1)} kg`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function localISO(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

const parse = (v: string) => (v.length === 10 ? new Date(`${v}T00:00:00`) : new Date(v));

export function fmtDate(value?: string | null): string {
  if (!value) return '—';
  const d = parse(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  const h = d.getHours();
  return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

export function dayLabel(value: string | Date): string {
  const iso = typeof value === 'string' ? value.slice(0, 10) : localISO(value);
  if (iso === localISO()) return 'Today';
  if (iso === localISO(addDays(new Date(), 1))) return 'Tomorrow';
  const d = parse(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export const isToday = (value?: string | null) => !!value && (value.length === 10 ? value : localISO(new Date(value))) === localISO();

const CO2: Record<string, number> = { NON_FERROUS: 4.5, FERROUS: 1.6, PAPER: 0.9, PLASTIC: 1.5, E_WASTE: 2.2 };
export const co2ForKg = (weight: number, group: string) => weight * (CO2[group] ?? 1.2);

export const shortName = (name: string) => name.split(' (')[0];
