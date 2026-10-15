/** Offline seed mirroring the backend DataInitializer: 12 Noida categories, agent Ravi, customer Priya, today's route. */
import type { CategoryGroup, OrderItem, OrderStatus, OrderType, PaymentMode, PickupOrder, ScrapCategory, User, UserRef } from '../types';
import { addDays, localISO, round2 } from '../utils/format';
import { SECTOR_COORDS } from '../utils/constants';

type Seed = [number, string, CategoryGroup, number, number, string];
const CATEGORY_SEED: Seed[] = [
  [1, 'Copper Wire (Bright)', 'NON_FERROUS', 680, 735, 'zap'],
  [2, 'Brass (Peetal)', 'NON_FERROUS', 420, 462, 'cog'],
  [3, 'Aluminium (Utensils & Sections)', 'NON_FERROUS', 145, 172, 'layers'],
  [4, 'HMS Iron (Heavy Melting)', 'FERROUS', 32, 38.5, 'hammer'],
  [5, 'Tin / Light Iron', 'FERROUS', 24, 29.5, 'wrench'],
  [6, 'Corrugated Gatta (Cardboard)', 'PAPER', 14, 18.5, 'box'],
  [7, 'Office Paper & Files', 'PAPER', 12, 16, 'file-text'],
  [8, 'Newspaper (Akhbaar)', 'PAPER', 15, 19.5, 'newspaper'],
  [9, 'PET Bottles', 'PLASTIC', 18, 26, 'cup-soda'],
  [10, 'HDPE Plastic (Cans & Drums)', 'PLASTIC', 22, 31, 'package'],
  [11, 'E-Waste & Appliances', 'E_WASTE', 45, 64, 'cpu'],
  [12, 'Mixed Day Scrap (Kabad)', 'FERROUS', 10, 14.5, 'recycle'],
];

export interface MockState {
  categories: ScrapCategory[];
  customer: User;
  agent: User;
  pickups: PickupOrder[];
  inventoryRawKg: Record<number, number>;
  currentRole: 'CUSTOMER' | 'AGENT';
  nextOrderSeq: number;
  nextId: number;
  nextItemId: number;
}

interface Def {
  n: number; c: UserRef; type?: OrderType; day: number; status: OrderStatus; agent?: boolean;
  sector: string; addr: string; slot: string; est: string; items?: [number, number][]; groups: string[]; mode?: PaymentMode;
}

export function buildInitialState(): MockState {
  const now = new Date();
  const year = now.getFullYear();
  const categories: ScrapCategory[] = CATEGORY_SEED.map(([id, name, categoryGroup, buy, mill, iconName]) => ({
    id, name, categoryGroup, unit: 'KG', buyingRateInr: buy, millSellingRateInr: mill, iconName, isActive: true, updatedAt: now.toISOString(),
  }));
  const byId = Object.fromEntries(categories.map((c) => [c.id, c])) as Record<number, ScrapCategory>;

  const customer: User = {
    id: 10, fullName: 'Priya Sharma', phone: '9876543210', email: 'priya.sharma@example.in', role: 'CUSTOMER',
    accountType: 'B2C_HOUSEHOLD', address: 'C-1204, Supertech Capetown', noidaSector: 'Sector 74', gullakTotalEarnings: 0, totalRecycledKg: 0,
  };
  const agent: User = { id: 2, fullName: 'Ravi Kumar', phone: '9876500001', role: 'AGENT', noidaSector: 'Sector 62', vehicle: 'Tata Ace, UP16 CT 4471' };
  const me: UserRef = { id: customer.id, fullName: customer.fullName, phone: customer.phone };
  const ravi: UserRef = { id: agent.id, fullName: agent.fullName, phone: agent.phone };

  let itemId = 1;
  const mkItems = (pairs: [number, number][]): OrderItem[] => pairs.map(([cid, w]) => {
    const c = byId[cid];
    return { id: itemId++, scrapCategory: { id: c.id, name: c.name, categoryGroup: c.categoryGroup, unit: c.unit }, netWeightKg: w, appliedBuyingRateInr: c.buyingRateInr, subTotalInr: round2(w * c.buyingRateInr) };
  });

  const defs: Def[] = [
    { n: 91, c: me, day: -28, status: 'PAID', agent: true, sector: 'Sector 74', addr: customer.address!, slot: '11 AM – 2 PM', est: '20 – 50 kg', items: [[6, 22.5], [8, 14], [9, 6.2]], groups: ['PAPER', 'PLASTIC'] },
    { n: 95, c: me, day: -17, status: 'PAID', agent: true, sector: 'Sector 74', addr: customer.address!, slot: '8 – 11 AM', est: '20 – 50 kg', items: [[4, 18], [5, 9.5], [3, 2.4]], groups: ['FERROUS', 'NON_FERROUS'] },
    { n: 98, c: me, day: -9, status: 'PAID', agent: true, sector: 'Sector 74', addr: customer.address!, slot: '5 – 8 PM', est: 'Under 20 kg', items: [[1, 1.2], [11, 7.8], [7, 11]], groups: ['E_WASTE', 'PAPER'], mode: 'BANK_TRANSFER' },
    { n: 101, c: me, day: -3, status: 'PAID', agent: true, sector: 'Sector 74', addr: customer.address!, slot: '2 – 5 PM', est: '20 – 50 kg', items: [[6, 16], [10, 4.5]], groups: ['PAPER', 'PLASTIC'] },
    // Today's route for agent Ravi Kumar
    { n: 103, c: me, day: 0, status: 'AGENT_ASSIGNED', agent: true, sector: 'Sector 74', addr: customer.address!, slot: '11 AM – 2 PM', est: '20 – 50 kg', groups: ['PAPER', 'FERROUS'] },
    { n: 99, c: { id: 21, fullName: 'Rohit Verma', phone: '9811122334' }, day: 0, status: 'AGENT_ASSIGNED', agent: true, sector: 'Sector 18', addr: 'B-42, Atta Market lane', slot: '2 – 5 PM', est: 'Under 20 kg', groups: ['PAPER'] },
    { n: 102, c: { id: 22, fullName: 'Neha Gupta', phone: '9899012345' }, day: 0, status: 'OUT_FOR_PICKUP', agent: true, sector: 'Sector 62', addr: 'Tower 6, Gaur Grandeur', slot: '8 – 11 AM', est: '20 – 50 kg', groups: ['E_WASTE', 'PLASTIC'] },
    { n: 97, c: { id: 27, fullName: 'Brightwave IT Park', phone: '9650033441' }, type: 'INDUSTRIAL_B2B', day: 0, status: 'AGENT_ASSIGNED', agent: true, sector: 'Sector 62', addr: 'Tower B, Brightwave IT Park, A-14', slot: '2 – 5 PM', est: '500 kg – 1 ton', groups: ['PAPER', 'E_WASTE'] },
    { n: 96, c: { id: 26, fullName: 'Amit Saxena', phone: '9717001122' }, day: 0, status: 'AGENT_ASSIGNED', agent: true, sector: 'Sector 137', addr: 'Paras Tierea, T-9', slot: '5 – 8 PM', est: '50 – 100 kg', groups: ['FERROUS', 'MIXED'] },
  ];

  const pickups: PickupOrder[] = defs.map((d, i) => {
    const items = d.items ? mkItems(d.items) : [];
    const paid = d.status === 'PAID';
    const sched = addDays(now, d.day);
    const [lat, lng] = SECTOR_COORDS[d.sector] ?? [28.5355, 77.391];
    const mode: PaymentMode = d.mode ?? 'UPI';
    return {
      id: i + 1,
      orderNumber: `SG-${year}-${String(d.n).padStart(4, '0')}`,
      customer: d.c,
      assignedAgent: d.agent ? ravi : null,
      orderType: d.type ?? 'DOORSTEP_B2C',
      status: d.status,
      noidaSector: d.sector,
      fullAddress: d.addr,
      gpsLat: lat,
      gpsLng: lng,
      scheduledDate: localISO(sched),
      timeSlot: d.slot,
      estimatedWeightRange: d.est,
      photoUrl: null,
      scrapGroups: d.groups,
      items,
      finalTotalWeightKg: paid ? round2(items.reduce((s, x) => s + x.netWeightKg, 0)) : null,
      finalPayoutInr: paid ? round2(items.reduce((s, x) => s + x.subTotalInr, 0)) : null,
      paymentMode: paid ? mode : null,
      upiTransactionRef: paid && mode === 'UPI' ? `4${String(17000000000 + d.n * 7919).padStart(11, '0')}` : null,
      createdAt: addDays(now, Math.min(d.day, 0) - 1).toISOString(),
      paidAt: paid ? new Date(new Date(sched).setHours(11 + (i % 5), 10 + i, 0, 0)).toISOString() : null,
    };
  });

  const mine = pickups.filter((p) => p.customer.id === customer.id && p.status === 'PAID');
  customer.gullakTotalEarnings = round2(mine.reduce((s, p) => s + (p.finalPayoutInr ?? 0), 0));
  customer.totalRecycledKg = round2(mine.reduce((s, p) => s + (p.finalTotalWeightKg ?? 0), 0));

  return {
    categories,
    customer,
    agent,
    pickups,
    inventoryRawKg: Object.fromEntries(categories.map((c) => [c.id, 0])),
    currentRole: 'CUSTOMER',
    nextOrderSeq: 104,
    nextId: pickups.length + 1,
    nextItemId: itemId,
  };
}
