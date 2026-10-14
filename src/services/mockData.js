/**
 * Seed data for offline / demo mode. Mirrors the Spring Boot DataInitializer:
 * 12 Noida scrap categories, yard inventory, 1 admin, field agents, customers and pickups.
 */
import { addDays, localISO, round2 } from '../utils/format';
import { SECTOR_COORDS } from '../utils/constants';

// [id, name, group, unit, buyingRateInr, millSellingRateInr, iconName]
const CATEGORY_SEED = [
  [1, 'Copper Wire (Bright)', 'NON_FERROUS', 'KG', 680, 735, 'zap'],
  [2, 'Brass (Peetal)', 'NON_FERROUS', 'KG', 420, 462, 'cog'],
  [3, 'Aluminium (Utensils & Sections)', 'NON_FERROUS', 'KG', 145, 172, 'layers'],
  [4, 'HMS Iron (Heavy Melting)', 'FERROUS', 'KG', 32, 38.5, 'hammer'],
  [5, 'Tin / Light Iron', 'FERROUS', 'KG', 24, 29.5, 'wrench'],
  [6, 'Corrugated Gatta (Cardboard)', 'PAPER', 'KG', 14, 18.5, 'box'],
  [7, 'Office Paper & Files', 'PAPER', 'KG', 12, 16, 'file-text'],
  [8, 'Newspaper (Akhbaar)', 'PAPER', 'KG', 15, 19.5, 'newspaper'],
  [9, 'PET Bottles', 'PLASTIC', 'KG', 18, 26, 'cup-soda'],
  [10, 'HDPE Plastic (Cans & Drums)', 'PLASTIC', 'KG', 22, 31, 'package'],
  [11, 'E-Waste & Appliances', 'E_WASTE', 'KG', 45, 64, 'cpu'],
  [12, 'Mixed Day Scrap (Kabad)', 'FERROUS', 'KG', 10, 14.5, 'recycle'],
];

// [categoryId, rawMixedKg, segregatedKg, baledKg, minTruckDispatchThresholdKg]
const INVENTORY_SEED = [
  [1, 46, 22, 310, 500], [2, 38, 15, 120, 500], [3, 120, 85, 640, 1000], [4, 1850, 2400, 7600, 8000],
  [5, 960, 1300, 2100, 5000], [6, 1420, 980, 6250, 6000], [7, 610, 450, 1700, 4000], [8, 380, 260, 1150, 3000],
  [9, 520, 410, 1900, 2500], [10, 260, 180, 620, 2000], [11, 340, 210, 880, 1500], [12, 1150, 0, 0, 3000],
];

export function buildInitialState() {
  const now = new Date();
  const year = now.getFullYear();
  const categories = CATEGORY_SEED.map(([id, name, categoryGroup, unit, buyingRateInr, millSellingRateInr, iconName]) => ({
    id, name, categoryGroup, unit, buyingRateInr, millSellingRateInr, iconName, isActive: true, updatedAt: now.toISOString(),
  }));
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

  const inventory = INVENTORY_SEED.map(([cid, raw, seg, baled, threshold]) => ({
    id: cid,
    scrapCategory: { id: cid, name: catById[cid].name, categoryGroup: catById[cid].categoryGroup },
    rawMixedWeightKg: raw, segregatedWeightKg: seg, baledReadyForMillWeightKg: baled,
    minTruckDispatchThresholdKg: threshold, lastUpdated: now.toISOString(),
  }));

  const users = {
    admin: { id: 1, fullName: 'Vikas Gupta', phone: '9999999999', email: 'yard@scrapgullak.in', role: 'ADMIN', accountType: 'B2C_HOUSEHOLD', noidaSector: 'Phase-2' },
    agents: [
      { id: 2, fullName: 'Ravi Kumar', phone: '9876500001', role: 'AGENT', noidaSector: 'Sector 62', vehicle: 'Tata Ace, UP16 CT 4471' },
      { id: 3, fullName: 'Sanjay Yadav', phone: '9876500002', role: 'AGENT', noidaSector: 'Phase-2', vehicle: 'Bolero Pickup, UP16 DT 2290' },
      { id: 4, fullName: 'Imran Khan', phone: '9876500003', role: 'AGENT', noidaSector: 'Greater Noida West', vehicle: 'E-loader, UP16 EV 0817' },
    ],
    customer: {
      id: 10, fullName: 'Priya Sharma', phone: '9876543210', email: 'priya.sharma@example.in', role: 'CUSTOMER',
      accountType: 'B2C_HOUSEHOLD', gstNumber: null, address: 'C-1204, Supertech Capetown', noidaSector: 'Sector 74',
      gullakTotalEarnings: 0, totalRecycledKg: 0, createdAt: addDays(now, -120).toISOString(),
    },
    corporate: {
      id: 11, fullName: 'Anil Mehta', companyName: 'Ecotech Components Pvt Ltd', phone: '9810011223',
      email: 'facility@ecotechcomponents.in', role: 'CUSTOMER', accountType: 'B2B_CORPORATE', gstNumber: '09AABCE1234F1Z5',
      address: 'Plot 14, Udyog Vihar', noidaSector: 'Ecotech-3 (Greater Noida)', gullakTotalEarnings: 0, totalRecycledKg: 0,
      createdAt: addDays(now, -200).toISOString(),
    },
  };

  let itemSeq = 1;
  const mkItems = (pairs) => pairs.map(([cid, kg]) => {
    const c = catById[cid];
    return {
      id: itemSeq++,
      scrapCategory: { id: c.id, name: c.name, categoryGroup: c.categoryGroup, unit: c.unit },
      netWeightKg: kg, appliedBuyingRateInr: c.buyingRateInr, subTotalInr: round2(kg * c.buyingRateInr),
    };
  });
  const ref = (u) => ({ id: u.id, fullName: u.companyName || u.fullName, phone: u.phone });
  const other = (id, fullName, phone) => ({ id, fullName, phone });
  const [ravi, sanjay] = users.agents;

  const defs = [
    { n: 91, c: ref(users.customer), day: -28, status: 'PAID', agent: ravi, sector: 'Sector 74', addr: users.customer.address, slot: '11 AM – 2 PM', est: '20 – 50 kg', items: [[6, 22.5], [8, 14], [9, 6.2]], groups: ['PAPER', 'PLASTIC'] },
    { n: 95, c: ref(users.customer), day: -17, status: 'PAID', agent: ravi, sector: 'Sector 74', addr: users.customer.address, slot: '8 – 11 AM', est: '20 – 50 kg', items: [[4, 18], [5, 9.5], [3, 2.4]], groups: ['FERROUS', 'NON_FERROUS'] },
    { n: 98, c: ref(users.customer), day: -9, status: 'PAID', agent: ravi, sector: 'Sector 74', addr: users.customer.address, slot: '5 – 8 PM', est: 'Under 20 kg', items: [[1, 1.2], [11, 7.8], [7, 11]], groups: ['E_WASTE', 'NON_FERROUS', 'PAPER'], mode: 'BANK_TRANSFER' },
    { n: 101, c: ref(users.customer), day: -3, status: 'PAID', agent: ravi, sector: 'Sector 74', addr: users.customer.address, slot: '2 – 5 PM', est: '20 – 50 kg', items: [[6, 16], [10, 4.5]], groups: ['PAPER', 'PLASTIC'] },
    { n: 103, c: ref(users.customer), day: 0, status: 'AGENT_ASSIGNED', agent: ravi, sector: 'Sector 74', addr: users.customer.address, slot: '11 AM – 2 PM', est: '20 – 50 kg', groups: ['PAPER', 'FERROUS'] },
    { n: 88, c: ref(users.corporate), type: 'INDUSTRIAL_B2B', day: -21, status: 'PAID', agent: sanjay, sector: 'Ecotech-3 (Greater Noida)', addr: users.corporate.address, slot: '8 – 11 AM', est: '1 – 5 ton', items: [[6, 1240], [4, 860], [10, 210]], groups: ['PAPER', 'FERROUS', 'PLASTIC'], mode: 'BANK_TRANSFER' },
    { n: 100, c: ref(users.corporate), type: 'INDUSTRIAL_B2B', day: 1, status: 'BOOKED', sector: 'Ecotech-3 (Greater Noida)', addr: users.corporate.address, slot: '8 – 11 AM', est: '1 – 5 ton', groups: ['PAPER', 'FERROUS', 'E_WASTE'] },
    { n: 99, c: other(21, 'Rohit Verma', '9811122334'), day: 0, status: 'BOOKED', sector: 'Sector 18', addr: 'B-42, Atta Market lane', slot: '2 – 5 PM', est: 'Under 20 kg', groups: ['PAPER'] },
    { n: 102, c: other(22, 'Neha Gupta', '9899012345'), day: 0, status: 'BOOKED', sector: 'Sector 125', addr: 'Tower 6, Jaypee Kosmos', slot: '5 – 8 PM', est: '20 – 50 kg', groups: ['E_WASTE', 'PLASTIC'] },
    { n: 93, c: other(23, 'Deepak Sharma', '9873456120'), day: 1, status: 'BOOKED', sector: 'Sector 63', addr: 'H-118, near Electronic City metro', slot: '11 AM – 2 PM', est: '50 – 100 kg', groups: ['FERROUS', 'MIXED'] },
    { n: 92, c: other(24, 'Sunita Rawat', '9958123477'), day: 0, status: 'BOOKED', sector: 'Indirapuram', addr: 'Shipra Suncity, Block 3', slot: '8 – 11 AM', est: '20 – 50 kg', groups: ['PAPER', 'MIXED'] },
    { n: 97, c: other(25, 'Kalpana Textiles', '9810456789'), type: 'INDUSTRIAL_B2B', day: 0, status: 'OUT_FOR_PICKUP', agent: sanjay, sector: 'Phase-2', addr: 'C-58, Hosiery Complex', slot: '8 – 11 AM', est: '500 kg – 1 ton', groups: ['PAPER', 'PLASTIC'] },
    { n: 96, c: other(26, 'Amit Saxena', '9717001122'), day: 0, status: 'PAID', agent: ravi, sector: 'Sector 137', addr: 'Paras Tierea, T-9', slot: '8 – 11 AM', est: '50 – 100 kg', items: [[4, 24], [6, 30], [9, 8]], groups: ['FERROUS', 'PAPER', 'PLASTIC'] },
    { n: 94, c: other(27, 'Brightwave IT Park', '9650033441'), type: 'INDUSTRIAL_B2B', day: 0, status: 'PAID', agent: sanjay, sector: 'Sector 135', addr: 'Tower B, Brightwave IT Park', slot: '8 – 11 AM', est: '500 kg – 1 ton', items: [[6, 410], [7, 260], [11, 85]], groups: ['PAPER', 'E_WASTE'], mode: 'BANK_TRANSFER' },
  ];

  const pickups = defs.map((d, idx) => {
    const scheduled = addDays(now, d.day);
    const created = addDays(now, Math.min(d.day, 0) - 1);
    const items = d.items ? mkItems(d.items) : [];
    const paid = d.status === 'PAID';
    const paidAt = paid ? new Date(new Date(scheduled).setHours(10 + (idx % 6), 15 + idx, 0, 0)).toISOString() : null;
    const [lat, lng] = SECTOR_COORDS[d.sector] || [28.5355, 77.391];
    return {
      id: idx + 1,
      orderNumber: `SG-${year}-${String(d.n).padStart(4, '0')}`,
      customer: d.c,
      assignedAgent: d.agent ? ref(d.agent) : null,
      orderType: d.type || 'DOORSTEP_B2C',
      status: d.status,
      noidaSector: d.sector,
      fullAddress: d.addr,
      gpsLat: lat, gpsLng: lng,
      scheduledDate: localISO(scheduled),
      timeSlot: d.slot,
      estimatedWeightRange: d.est,
      scrapGroups: d.groups,
      photoUrl: null,
      items,
      finalTotalWeightKg: paid ? round2(items.reduce((s, i) => s + i.netWeightKg, 0)) : null,
      finalPayoutInr: paid ? round2(items.reduce((s, i) => s + i.subTotalInr, 0)) : null,
      paymentMode: paid ? d.mode || 'UPI' : null,
      upiTransactionRef: paid && (d.mode || 'UPI') === 'UPI' ? `4${String(17000000000 + d.n * 7919).padStart(11, '0')}` : null,
      createdAt: created.toISOString(),
      paidAt,
    };
  });

  for (const u of [users.customer, users.corporate]) {
    const mine = pickups.filter((p) => p.customer.id === u.id && p.status === 'PAID');
    u.gullakTotalEarnings = round2(mine.reduce((s, p) => s + p.finalPayoutInr, 0));
    u.totalRecycledKg = round2(mine.reduce((s, p) => s + p.finalTotalWeightKg, 0));
  }

  return {
    version: 1,
    categories,
    inventory,
    users,
    pickups,
    currentUser: 'customer',
    nextOrderSeq: 104,
    nextPickupId: pickups.length + 1,
    nextItemId: itemSeq,
  };
}
