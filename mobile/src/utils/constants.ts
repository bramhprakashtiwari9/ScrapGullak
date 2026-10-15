import type { OrderStatus, PaymentMode } from '../types';

export const COLORS = {
  gullak: '#10B981',
  gullakDark: '#047857',
  gullakSoft: '#ECFDF5',
  trust: '#0F172A',
  coin: '#F59E0B',
  coinDark: '#B45309',
  slate400: '#94A3B8',
  slate500: '#64748B',
  white: '#FFFFFF',
};

export const NOIDA_SECTORS = [
  'Sector 18', 'Sector 50', 'Sector 62', 'Sector 63', 'Sector 74', 'Sector 75', 'Sector 80',
  'Sector 125', 'Sector 135', 'Sector 137', 'Phase-2', 'Ecotech-3 (Greater Noida)',
  'Greater Noida West', 'Knowledge Park', 'Indirapuram',
];

export const SECTOR_COORDS: Record<string, [number, number]> = {
  'Sector 18': [28.5708, 77.3261], 'Sector 50': [28.571, 77.364], 'Sector 62': [28.627, 77.3727],
  'Sector 63': [28.6206, 77.3866], 'Sector 74': [28.577, 77.388], 'Sector 75': [28.575, 77.382],
  'Sector 80': [28.546, 77.393], 'Sector 125': [28.544, 77.326], 'Sector 135': [28.497, 77.408],
  'Sector 137': [28.51, 77.409], 'Phase-2': [28.5355, 77.405], 'Ecotech-3 (Greater Noida)': [28.556, 77.46],
  'Greater Noida West': [28.604, 77.438], 'Knowledge Park': [28.472, 77.488], Indirapuram: [28.646, 77.369],
};

export const TIME_SLOTS = ['8 – 11 AM', '11 AM – 2 PM', '2 – 5 PM', '5 – 8 PM'];

export const WEIGHT_RANGES = {
  DOORSTEP_B2C: ['Under 20 kg', '20 – 50 kg', '50 – 100 kg', '100 kg +'],
  INDUSTRIAL_B2B: ['100 – 500 kg', '500 kg – 1 ton', '1 – 5 ton', '5 ton +'],
} as const;

/** Visual tiles on the customer "Sell scrap" cart. categoryId points at the representative rate. */
export const CART_TILES = [
  { id: 'gatta', label: 'Gatta & cartons', group: 'PAPER', categoryId: 6, icon: 'box', tone: 'bg-orange-100' },
  { id: 'iron', label: 'Iron & steel', group: 'FERROUS', categoryId: 4, icon: 'hammer', tone: 'bg-slate-200' },
  { id: 'copper', label: 'Copper & brass', group: 'NON_FERROUS', categoryId: 1, icon: 'zap', tone: 'bg-amber-100' },
  { id: 'plastic', label: 'Plastic bottles', group: 'PLASTIC', categoryId: 9, icon: 'cup-soda', tone: 'bg-sky-100' },
  { id: 'appliances', label: 'Old appliances', group: 'E_WASTE', categoryId: 11, icon: 'cpu', tone: 'bg-violet-100' },
  { id: 'mixed', label: 'Mixed day scrap', group: 'MIXED', categoryId: 12, icon: 'recycle', tone: 'bg-emerald-100' },
] as const;

export const GROUP_LABEL: Record<string, string> = {
  NON_FERROUS: 'Non-ferrous', FERROUS: 'Iron & steel', PAPER: 'Paper & gatta', PLASTIC: 'Plastic', E_WASTE: 'E-waste', MIXED: 'Mixed',
};

export const GROUP_TONE: Record<string, string> = {
  NON_FERROUS: 'bg-amber-100', FERROUS: 'bg-slate-200', PAPER: 'bg-orange-100', PLASTIC: 'bg-sky-100', E_WASTE: 'bg-violet-100', MIXED: 'bg-emerald-100',
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  BOOKED: 'Booked', AGENT_ASSIGNED: 'Agent assigned', OUT_FOR_PICKUP: 'Out for pickup', WEIGHED: 'Weighed', PAID: 'Paid', CANCELLED: 'Cancelled',
};

export const PAYMENT_LABEL: Record<PaymentMode, string> = { UPI: 'UPI', CASH: 'Cash', BANK_TRANSFER: 'Bank transfer' };
