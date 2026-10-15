/**
 * In-browser mock backend. Implements every /api/v1 endpoint the web app uses, with the same
 * business rules as the Spring Boot services, so the UI stays fully interactive offline.
 * State persists in localStorage so a demo survives page reloads.
 */
import { buildInitialState } from './mockData';
import { ApiError } from './errors';
import { co2ForKg, isToday, round2 } from '../utils/format';

const STORAGE_KEY = 'scrapgullak-demo-state-v1';

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1) return parsed;
    }
  } catch { /* storage unavailable: fall through to fresh seed */ }
  return buildInitialState();
}

let state = load();

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* quota or private mode: keep in memory */ }
}

const clone = (x) => JSON.parse(JSON.stringify(x));
const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

export function resetMockState() {
  state = buildInitialState();
  save();
}

function currentUser() {
  const key = state.currentUser;
  if (key === 'admin') return state.users.admin;
  if (key === 'corporate') return state.users.corporate;
  if (key === 'agent') return state.users.agents[0];
  return state.users.customer;
}

function requireRole(...roles) {
  const u = currentUser();
  if (!roles.includes(u.role)) throw new ApiError('You do not have access to this action.', 403);
  return u;
}

function findCategory(id) {
  const c = state.categories.find((x) => String(x.id) === String(id));
  if (!c) throw new ApiError(`Scrap category ${id} was not found.`, 404);
  return c;
}

function findOrder(id) {
  const o = state.pickups.find((p) => String(p.id) === String(id) || p.orderNumber === id);
  if (!o) throw new ApiError(`Pickup ${id} was not found.`, 404);
  return o;
}

function passbookFor(user) {
  const paid = state.pickups
    .filter((p) => p.customer.id === user.id && p.status === 'PAID')
    .sort((a, b) => new Date(b.paidAt) - new Date(a.paidAt));
  const co2 = paid.reduce((s, p) => s + (p.items || []).reduce((a, i) => a + co2ForKg(i.netWeightKg, i.scrapCategory.categoryGroup), 0), 0);
  return {
    gullakTotalEarnings: round2(user.gullakTotalEarnings || 0),
    totalRecycledKg: round2(user.totalRecycledKg || 0),
    co2SavedKg: Math.round(co2),
    totalPickups: paid.length,
    transactions: paid.map((p) => ({
      orderId: p.id, orderNumber: p.orderNumber, date: p.paidAt, weightKg: p.finalTotalWeightKg,
      amountInr: p.finalPayoutInr, paymentMode: p.paymentMode, upiTransactionRef: p.upiTransactionRef,
    })),
  };
}

function nextOrderNumber() {
  const n = state.nextOrderSeq++;
  return `SG-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
}

export const mock = {
  // ---------- Auth ----------
  async login(roleKey) {
    await delay();
    const map = { ADMIN: 'admin', CORPORATE: 'corporate', AGENT: 'agent', CUSTOMER: 'customer' };
    state.currentUser = map[roleKey] || 'customer';
    save();
    const user = currentUser();
    return {
      token: `mock.${state.currentUser}.${Date.now()}`,
      user: clone(user),
      role: user.role,
      passbook: user.role === 'CUSTOMER' ? passbookFor(user) : null,
    };
  },

  // ---------- Rates ----------
  async liveRates() {
    await delay(150);
    return clone(state.categories.filter((c) => c.isActive));
  },

  async estimate(items) {
    await delay(120);
    const lines = (items || []).filter((i) => Number(i.weightKg) > 0).map((i) => {
      const c = findCategory(i.categoryId);
      const weightKg = Number(i.weightKg);
      return { categoryId: c.id, categoryName: c.name, weightKg, buyingRateInr: c.buyingRateInr, subTotalInr: round2(weightKg * c.buyingRateInr) };
    });
    return {
      items: lines,
      totalWeightKg: round2(lines.reduce((s, l) => s + l.weightKg, 0)),
      totalEstimatedPayoutInr: round2(lines.reduce((s, l) => s + l.subTotalInr, 0)),
    };
  },

  // ---------- Customer ----------
  async createPickup(payload) {
    await delay(450);
    const user = requireRole('CUSTOMER');
    const order = {
      id: state.nextPickupId++,
      orderNumber: nextOrderNumber(),
      customer: { id: user.id, fullName: payload.companyName || user.companyName || user.fullName, phone: payload.contactPhone || user.phone },
      assignedAgent: null,
      orderType: payload.orderType || 'DOORSTEP_B2C',
      status: 'BOOKED',
      noidaSector: payload.noidaSector,
      fullAddress: payload.fullAddress,
      gpsLat: payload.gpsLat ?? null,
      gpsLng: payload.gpsLng ?? null,
      scheduledDate: payload.scheduledDate,
      timeSlot: payload.timeSlot,
      estimatedWeightRange: payload.estimatedWeightRange,
      scrapGroups: payload.scrapGroups || [],
      photoUrl: payload.photoUrl || null,
      notes: payload.notes || null,
      corporateDetails: payload.corporateDetails || null,
      items: [],
      finalTotalWeightKg: null,
      finalPayoutInr: null,
      paymentMode: null,
      upiTransactionRef: null,
      createdAt: new Date().toISOString(),
      paidAt: null,
    };
    state.pickups.push(order);
    save();
    return clone(order);
  },

  async myPickups() {
    await delay(180);
    const user = requireRole('CUSTOMER');
    return clone(state.pickups.filter((p) => p.customer.id === user.id).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  },

  async passbook() {
    await delay(180);
    return clone(passbookFor(requireRole('CUSTOMER')));
  },

  // ---------- Agent ----------
  async assignedPickups() {
    await delay(180);
    const agent = requireRole('AGENT');
    return clone(state.pickups
      .filter((p) => p.assignedAgent?.id === agent.id && ['AGENT_ASSIGNED', 'OUT_FOR_PICKUP'].includes(p.status))
      .sort((a, b) => a.noidaSector.localeCompare(b.noidaSector, 'en', { numeric: true })));
  },

  async completeWeighing(orderId, { items, paymentMode = 'UPI', upiTransactionRef = null }) {
    await delay(500);
    requireRole('AGENT', 'ADMIN');
    const order = findOrder(orderId);
    if (['PAID', 'CANCELLED'].includes(order.status)) throw new ApiError(`Pickup ${order.orderNumber} is already ${order.status.toLowerCase()}.`, 409);
    const clean = (items || []).filter((i) => Number(i.netWeightKg) > 0);
    if (!clean.length) throw new ApiError('Add at least one weighed scrap grade.', 422);

    order.items = clean.map((i) => {
      const c = findCategory(i.categoryId);
      const kg = round2(Number(i.netWeightKg));
      return {
        id: state.nextItemId++,
        scrapCategory: { id: c.id, name: c.name, categoryGroup: c.categoryGroup, unit: c.unit },
        netWeightKg: kg, appliedBuyingRateInr: c.buyingRateInr, subTotalInr: round2(kg * c.buyingRateInr),
      };
    });
    order.finalTotalWeightKg = round2(order.items.reduce((s, i) => s + i.netWeightKg, 0));
    order.finalPayoutInr = round2(order.items.reduce((s, i) => s + i.subTotalInr, 0));
    order.paymentMode = paymentMode;
    order.upiTransactionRef = upiTransactionRef;
    order.status = 'PAID';
    order.paidAt = new Date().toISOString();

    const customer = [state.users.customer, state.users.corporate].find((u) => u.id === order.customer.id);
    if (customer) {
      customer.gullakTotalEarnings = round2((customer.gullakTotalEarnings || 0) + order.finalPayoutInr);
      customer.totalRecycledKg = round2((customer.totalRecycledKg || 0) + order.finalTotalWeightKg);
    }
    for (const item of order.items) {
      const inv = state.inventory.find((x) => x.scrapCategory.id === item.scrapCategory.id);
      if (inv) {
        inv.rawMixedWeightKg = round2(inv.rawMixedWeightKg + item.netWeightKg);
        inv.lastUpdated = new Date().toISOString();
      }
    }
    save();
    return clone(order);
  },

  // ---------- Admin ----------
  async updateRate(categoryId, { buyingRateInr, millSellingRateInr }) {
    await delay(300);
    requireRole('ADMIN');
    const c = findCategory(categoryId);
    const buy = Number(buyingRateInr);
    const mill = Number(millSellingRateInr);
    if (!(buy > 0) || !(mill > 0)) throw new ApiError('Rates must be greater than ₹0.', 422);
    c.buyingRateInr = round2(buy);
    c.millSellingRateInr = round2(mill);
    c.updatedAt = new Date().toISOString();
    save();
    return clone(c);
  },

  async assignAgent(orderId, agentId) {
    await delay(300);
    requireRole('ADMIN');
    const order = findOrder(orderId);
    const agent = state.users.agents.find((a) => String(a.id) === String(agentId));
    if (!agent) throw new ApiError('That agent was not found.', 404);
    if (['PAID', 'CANCELLED'].includes(order.status)) throw new ApiError(`Pickup ${order.orderNumber} is already closed.`, 409);
    order.assignedAgent = { id: agent.id, fullName: agent.fullName, phone: agent.phone };
    if (order.status === 'BOOKED') order.status = 'AGENT_ASSIGNED';
    save();
    return clone(order);
  },

  /** stage: SEGREGATE (raw → segregated), BALE (segregated → baled), DISPATCH (baled → mill truck) */
  async processInventory({ categoryId, stage, weightKg }) {
    await delay(300);
    requireRole('ADMIN');
    const inv = state.inventory.find((x) => String(x.scrapCategory.id) === String(categoryId));
    if (!inv) throw new ApiError('No yard stock exists for that category.', 404);
    const kg = round2(Number(weightKg));
    if (!(kg > 0)) throw new ApiError('Enter a weight greater than 0 kg.', 422);
    const name = inv.scrapCategory.name;
    if (stage === 'SEGREGATE') {
      if (kg > inv.rawMixedWeightKg) throw new ApiError(`Only ${inv.rawMixedWeightKg} kg of raw ${name} is on the yard.`, 422);
      inv.rawMixedWeightKg = round2(inv.rawMixedWeightKg - kg);
      inv.segregatedWeightKg = round2(inv.segregatedWeightKg + kg);
    } else if (stage === 'BALE') {
      if (kg > inv.segregatedWeightKg) throw new ApiError(`Only ${inv.segregatedWeightKg} kg of sorted ${name} is ready to bale.`, 422);
      inv.segregatedWeightKg = round2(inv.segregatedWeightKg - kg);
      inv.baledReadyForMillWeightKg = round2(inv.baledReadyForMillWeightKg + kg);
    } else if (stage === 'DISPATCH') {
      if (kg > inv.baledReadyForMillWeightKg) throw new ApiError(`Only ${inv.baledReadyForMillWeightKg} kg of ${name} is baled.`, 422);
      inv.baledReadyForMillWeightKg = round2(inv.baledReadyForMillWeightKg - kg);
    } else {
      throw new ApiError('Unknown processing stage.', 422);
    }
    inv.lastUpdated = new Date().toISOString();
    save();
    return clone(inv);
  },

  async metrics() {
    await delay(200);
    requireRole('ADMIN');
    const rateOf = Object.fromEntries(state.categories.map((c) => [c.id, c]));
    const todayPaid = state.pickups.filter((p) => p.status === 'PAID' && isToday(p.paidAt));
    const procurement = todayPaid.reduce((s, p) => s + p.finalPayoutInr, 0);
    const resale = todayPaid.reduce((s, p) => s + p.items.reduce((a, i) => a + i.netWeightKg * (rateOf[i.scrapCategory.id]?.millSellingRateInr || 0), 0), 0);
    const collectedKg = todayPaid.reduce((s, p) => s + p.finalTotalWeightKg, 0);
    const truckAlerts = state.inventory
      .map((inv) => ({
        categoryId: inv.scrapCategory.id,
        categoryName: inv.scrapCategory.name,
        baledKg: inv.baledReadyForMillWeightKg,
        thresholdKg: inv.minTruckDispatchThresholdKg,
        readinessPercent: Math.round((inv.baledReadyForMillWeightKg / inv.minTruckDispatchThresholdKg) * 100),
        ready: inv.baledReadyForMillWeightKg >= inv.minTruckDispatchThresholdKg,
      }))
      .filter((a) => a.readinessPercent >= 75)
      .sort((a, b) => b.readinessPercent - a.readinessPercent);
    return {
      date: new Date().toISOString(),
      todayProcurementCostInr: round2(procurement),
      projectedMillResaleInr: round2(resale),
      netProfitMarginInr: round2(resale - procurement),
      marginPercent: resale ? round2(((resale - procurement) / resale) * 100) : 0,
      todayCollectedKg: round2(collectedKg),
      todayCompletedPickups: todayPaid.length,
      pendingPickups: state.pickups.filter((p) => ['BOOKED', 'AGENT_ASSIGNED', 'OUT_FOR_PICKUP'].includes(p.status)).length,
      unassignedPickups: state.pickups.filter((p) => p.status === 'BOOKED').length,
      truckAlerts,
    };
  },

  async allPickups() {
    await delay(180);
    requireRole('ADMIN');
    return clone([...state.pickups].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  },

  async agents() {
    await delay(120);
    requireRole('ADMIN');
    return clone(state.users.agents.map((a) => ({
      ...a,
      activePickups: state.pickups.filter((p) => p.assignedAgent?.id === a.id && ['AGENT_ASSIGNED', 'OUT_FOR_PICKUP'].includes(p.status)).length,
    })));
  },

  async inventory() {
    await delay(150);
    requireRole('ADMIN');
    return clone(state.inventory);
  },
};
