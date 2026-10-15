/**
 * In-memory mock backend for Expo Go / emulator testing without the Spring Boot server.
 * Same business rules as the backend: weighing computes subtotals, marks PAID, credits the
 * customer's Gullak, and adds the weight to yard raw inventory.
 */
import type { AuthResult, CreatePickupPayload, Estimate, Passbook, PickupOrder, ScrapCategory, WeighingPayload } from '../types';
import { buildInitialState, type MockState } from './mockData';
import { ApiError } from './errors';
import { co2ForKg, round2 } from '../utils/format';

let state: MockState = buildInitialState();
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const delay = (ms = 250) => new Promise((r) => setTimeout(r, ms));

/** Simulates the admin dispatch desk assigning a new booking to a field agent. */
const SIMULATED_DISPATCH_MS = 8000;

export function resetMock() {
  state = buildInitialState();
}

function findCategory(id: number): ScrapCategory {
  const c = state.categories.find((x) => x.id === Number(id));
  if (!c) throw new ApiError(`Scrap category ${id} was not found.`, 404);
  return c;
}

function passbook(): Passbook {
  const u = state.customer;
  const paid = state.pickups
    .filter((p) => p.customer.id === u.id && p.status === 'PAID')
    .sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)));
  const co2 = paid.reduce((s, p) => s + p.items.reduce((a, i) => a + co2ForKg(i.netWeightKg, i.scrapCategory.categoryGroup), 0), 0);
  return {
    gullakTotalEarnings: u.gullakTotalEarnings ?? 0,
    totalRecycledKg: u.totalRecycledKg ?? 0,
    co2SavedKg: Math.round(co2),
    totalPickups: paid.length,
    transactions: paid.map((p) => ({
      orderId: p.id, orderNumber: p.orderNumber, date: p.paidAt ?? p.createdAt, weightKg: p.finalTotalWeightKg ?? 0,
      amountInr: p.finalPayoutInr ?? 0, paymentMode: p.paymentMode ?? 'UPI', upiTransactionRef: p.upiTransactionRef,
    })),
  };
}

export const mock = {
  async login(role: 'CUSTOMER' | 'AGENT'): Promise<AuthResult> {
    await delay();
    state.currentRole = role;
    const user = role === 'AGENT' ? state.agent : state.customer;
    return { token: `mock.${role.toLowerCase()}.${Date.now()}`, user: clone(user), role: user.role };
  },

  async liveRates(): Promise<ScrapCategory[]> {
    await delay(150);
    return clone(state.categories.filter((c) => c.isActive));
  },

  async estimate(items: { categoryId: number; weightKg: number }[]): Promise<Estimate> {
    await delay(100);
    const lines = items.filter((i) => i.weightKg > 0).map((i) => ({ w: i.weightKg, sub: i.weightKg * findCategory(i.categoryId).buyingRateInr }));
    return { totalWeightKg: round2(lines.reduce((s, l) => s + l.w, 0)), totalEstimatedPayoutInr: round2(lines.reduce((s, l) => s + l.sub, 0)) };
  },

  async createPickup(payload: CreatePickupPayload): Promise<PickupOrder> {
    await delay(500);
    const u = state.customer;
    const order: PickupOrder = {
      id: state.nextId++,
      orderNumber: `SG-${new Date().getFullYear()}-${String(state.nextOrderSeq++).padStart(4, '0')}`,
      customer: { id: u.id, fullName: u.fullName, phone: u.phone },
      assignedAgent: null,
      status: 'BOOKED',
      items: [],
      finalTotalWeightKg: null,
      finalPayoutInr: null,
      paymentMode: null,
      upiTransactionRef: null,
      createdAt: new Date().toISOString(),
      paidAt: null,
      ...payload,
    };
    state.pickups.push(order);
    setTimeout(() => {
      if (order.status === 'BOOKED') {
        order.status = 'AGENT_ASSIGNED';
        order.assignedAgent = { id: state.agent.id, fullName: state.agent.fullName, phone: state.agent.phone };
      }
    }, SIMULATED_DISPATCH_MS);
    return clone(order);
  },

  async myPickups(): Promise<PickupOrder[]> {
    await delay(180);
    return clone(state.pickups.filter((p) => p.customer.id === state.customer.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  },

  async passbook(): Promise<Passbook> {
    await delay(180);
    return clone(passbook());
  },

  async assignedPickups(): Promise<PickupOrder[]> {
    await delay(180);
    return clone(state.pickups
      .filter((p) => p.assignedAgent?.id === state.agent.id && (p.status === 'AGENT_ASSIGNED' || p.status === 'OUT_FOR_PICKUP'))
      .sort((a, b) => a.noidaSector.localeCompare(b.noidaSector, 'en', { numeric: true }) || a.timeSlot.localeCompare(b.timeSlot)));
  },

  async completeWeighing(orderId: number, payload: WeighingPayload): Promise<PickupOrder> {
    await delay(600);
    const order = state.pickups.find((p) => p.id === Number(orderId));
    if (!order) throw new ApiError(`Pickup ${orderId} was not found.`, 404);
    if (order.status === 'PAID' || order.status === 'CANCELLED') throw new ApiError(`Pickup ${order.orderNumber} is already closed.`, 409);
    const lines = payload.items.filter((i) => i.netWeightKg > 0);
    if (!lines.length) throw new ApiError('Add at least one weighed scrap grade.', 422);

    order.items = lines.map((i) => {
      const c = findCategory(i.categoryId);
      const w = round2(i.netWeightKg);
      return { id: state.nextItemId++, scrapCategory: { id: c.id, name: c.name, categoryGroup: c.categoryGroup, unit: c.unit }, netWeightKg: w, appliedBuyingRateInr: c.buyingRateInr, subTotalInr: round2(w * c.buyingRateInr) };
    });
    order.finalTotalWeightKg = round2(order.items.reduce((s, i) => s + i.netWeightKg, 0));
    order.finalPayoutInr = round2(order.items.reduce((s, i) => s + i.subTotalInr, 0));
    order.paymentMode = payload.paymentMode;
    order.upiTransactionRef = payload.upiTransactionRef;
    order.status = 'PAID';
    order.paidAt = new Date().toISOString();

    if (order.customer.id === state.customer.id) {
      state.customer.gullakTotalEarnings = round2((state.customer.gullakTotalEarnings ?? 0) + order.finalPayoutInr);
      state.customer.totalRecycledKg = round2((state.customer.totalRecycledKg ?? 0) + order.finalTotalWeightKg);
    }
    for (const i of order.items) {
      state.inventoryRawKg[i.scrapCategory.id] = round2((state.inventoryRawKg[i.scrapCategory.id] ?? 0) + i.netWeightKg);
    }
    return clone(order);
  },
};
