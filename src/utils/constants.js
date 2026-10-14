export const NOIDA_SECTORS = [
  'Sector 18', 'Sector 50', 'Sector 62', 'Sector 63', 'Sector 74', 'Sector 75', 'Sector 80',
  'Sector 125', 'Sector 135', 'Sector 137', 'Phase-2', 'Ecotech-3 (Greater Noida)',
  'Greater Noida West', 'Knowledge Park', 'Indirapuram',
];

/** Approximate sector centroids, used when the customer does not share GPS. */
export const SECTOR_COORDS = {
  'Sector 18': [28.5708, 77.3261], 'Sector 50': [28.5710, 77.3640], 'Sector 62': [28.6270, 77.3727],
  'Sector 63': [28.6206, 77.3866], 'Sector 74': [28.5770, 77.3880], 'Sector 75': [28.5750, 77.3820],
  'Sector 80': [28.5460, 77.3930], 'Sector 125': [28.5440, 77.3260], 'Sector 135': [28.4970, 77.4080],
  'Sector 137': [28.5100, 77.4090], 'Phase-2': [28.5355, 77.4050], 'Ecotech-3 (Greater Noida)': [28.5560, 77.4600],
  'Greater Noida West': [28.6040, 77.4380], 'Knowledge Park': [28.4720, 77.4880], Indirapuram: [28.6460, 77.3690],
};

export const TIME_SLOTS = ['8 – 11 AM', '11 AM – 2 PM', '2 – 5 PM', '5 – 8 PM'];

export const WEIGHT_RANGES = {
  DOORSTEP_B2C: ['Under 20 kg', '20 – 50 kg', '50 – 100 kg', '100 kg +'],
  INDUSTRIAL_B2B: ['100 – 500 kg', '500 kg – 1 ton', '1 – 5 ton', '5 ton + (full truck)'],
};

/** Booking-level scrap groups (Step 2 of the pickup widget). */
export const SCRAP_GROUPS = [
  { id: 'FERROUS', label: 'Ferrous iron / HMS', hint: 'Almirahs, grills, cooler bodies, machine parts', icon: 'hammer' },
  { id: 'NON_FERROUS', label: 'Copper, brass & aluminium', hint: 'Wiring, taps, utensils, window sections', icon: 'zap' },
  { id: 'PAPER', label: 'Corrugated gatta & paper', hint: 'Cartons, newspaper, office files', icon: 'box' },
  { id: 'PLASTIC', label: 'PET & HDPE plastic', hint: 'Bottles, cans, drums, crates', icon: 'cup-soda' },
  { id: 'E_WASTE', label: 'E-waste & ACs', hint: 'ACs, fridges, CPUs, UPS, cables', icon: 'cpu' },
  { id: 'MIXED', label: 'Mixed day scrap', hint: 'Unsorted storeroom kabad, we sort it for you', icon: 'recycle' },
];

export const CATEGORY_GROUPS = [
  { id: 'ALL', label: 'All grades' },
  { id: 'NON_FERROUS', label: 'Non-ferrous' },
  { id: 'FERROUS', label: 'Iron & steel' },
  { id: 'PAPER', label: 'Paper & gatta' },
  { id: 'PLASTIC', label: 'Plastic' },
  { id: 'E_WASTE', label: 'E-waste' },
];
export const GROUP_LABEL = { ...Object.fromEntries(CATEGORY_GROUPS.map((g) => [g.id, g.label])), MIXED: 'Mixed' };

export const GROUP_TONE = {
  NON_FERROUS: 'bg-amber-100 text-amber-800',
  FERROUS: 'bg-slate-200 text-slate-700',
  PAPER: 'bg-orange-100 text-orange-800',
  PLASTIC: 'bg-sky-100 text-sky-800',
  E_WASTE: 'bg-violet-100 text-violet-800',
  MIXED: 'bg-emerald-100 text-emerald-800',
};

export const ORDER_STATUS = {
  BOOKED: { label: 'Booked', className: 'bg-slate-100 text-slate-700' },
  AGENT_ASSIGNED: { label: 'Agent assigned', className: 'bg-sky-100 text-sky-800' },
  OUT_FOR_PICKUP: { label: 'Out for pickup', className: 'bg-amber-100 text-amber-800' },
  WEIGHED: { label: 'Weighed', className: 'bg-violet-100 text-violet-800' },
  PAID: { label: 'Paid', className: 'bg-emerald-100 text-emerald-800' },
  CANCELLED: { label: 'Cancelled', className: 'bg-rose-100 text-rose-700' },
};
export const STATUS_FLOW = ['BOOKED', 'AGENT_ASSIGNED', 'OUT_FOR_PICKUP', 'WEIGHED', 'PAID'];

export const PAYMENT_MODE_LABEL = { UPI: 'UPI', BANK_TRANSFER: 'Bank transfer', CASH: 'Cash' };

export const B2B_ZONES = [
  { id: 'Phase-2', name: 'Noida Phase-2', detail: 'Hosiery complex, garment and engineering units' },
  { id: 'Sector 80', name: 'Sector 80 industrial area', detail: 'Sheet-metal fabrication and packaging units' },
  { id: 'Ecotech-3 (Greater Noida)', name: 'Ecotech-1 & 3, Greater Noida', detail: 'Auto components, electronics assembly, warehousing' },
  { id: 'Sector 63', name: 'Sector 63', detail: 'Electronics and mobile manufacturing' },
  { id: 'Sector 62', name: 'Sector 62 IT parks', detail: 'Office paper, e-waste, cafeteria PET' },
  { id: 'Sector 135', name: 'Expressway IT campuses (125–135)', detail: 'IT asset disposal, furniture, cartons' },
];
export const MONTHLY_VOLUMES = ['Under 500 kg', '500 kg – 2 ton', '2 – 10 ton', '10 ton +'];
export const PICKUP_FREQUENCIES = ['One-time lift', 'Weekly', 'Fortnightly', 'Monthly contract', 'Annual tender'];

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PHONE_REGEX = /^[6-9]\d{9}$/;

/** What a category turns into on the yard floor once baled for the mill. */
export function baleLabel(name = '') {
  const n = name.toLowerCase();
  if (/gatta|cardboard/.test(n)) return 'Baled cardboard';
  if (/pet/.test(n)) return 'Crushed PET bales';
  if (/hms/.test(n)) return 'HMS iron bundles';
  if (/newspaper|akhbaar/.test(n)) return 'Newspaper bales';
  if (/office|paper/.test(n)) return 'Shredded paper bales';
  if (/copper/.test(n)) return 'Graded bright copper';
  if (/brass/.test(n)) return 'Brass lots';
  if (/alumin/.test(n)) return 'Aluminium bundles';
  if (/tin|light iron/.test(n)) return 'Pressed tin bundles';
  if (/hdpe/.test(n)) return 'HDPE regrind bags';
  if (/e-waste|appliance/.test(n)) return 'Dismantled e-waste lots';
  if (/mixed/.test(n)) return 'Sorted into other grades';
  return 'Mill-ready stock';
}

export const groupOfCategory = (cat) => (/mixed/i.test(cat?.name || '') ? 'MIXED' : cat?.categoryGroup);
