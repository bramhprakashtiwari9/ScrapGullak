export type Role = 'CUSTOMER' | 'AGENT' | 'ADMIN';
export type CategoryGroup = 'NON_FERROUS' | 'FERROUS' | 'PAPER' | 'PLASTIC' | 'E_WASTE';
export type OrderStatus = 'BOOKED' | 'AGENT_ASSIGNED' | 'OUT_FOR_PICKUP' | 'WEIGHED' | 'PAID' | 'CANCELLED';
export type OrderType = 'DOORSTEP_B2C' | 'INDUSTRIAL_B2B';
export type PaymentMode = 'UPI' | 'BANK_TRANSFER' | 'CASH';

export interface ScrapCategory {
  id: number;
  name: string;
  categoryGroup: CategoryGroup;
  unit: 'KG' | 'PIECE' | 'TON';
  buyingRateInr: number;
  millSellingRateInr?: number;
  iconName?: string;
  isActive?: boolean;
  updatedAt?: string;
}

export interface UserRef {
  id: number;
  fullName: string;
  phone: string;
}

export interface User extends UserRef {
  email?: string;
  role: Role;
  accountType?: 'B2C_HOUSEHOLD' | 'B2B_CORPORATE';
  address?: string;
  noidaSector?: string;
  gullakTotalEarnings?: number;
  totalRecycledKg?: number;
  vehicle?: string;
}

export interface OrderItem {
  id?: number;
  scrapCategory: { id: number; name: string; categoryGroup: CategoryGroup; unit?: string };
  netWeightKg: number;
  appliedBuyingRateInr: number;
  subTotalInr: number;
}

export interface PickupOrder {
  id: number;
  orderNumber: string;
  customer: UserRef;
  assignedAgent: UserRef | null;
  orderType: OrderType;
  status: OrderStatus;
  noidaSector: string;
  fullAddress: string;
  gpsLat: number | null;
  gpsLng: number | null;
  scheduledDate: string;
  timeSlot: string;
  estimatedWeightRange: string;
  photoUrl: string | null;
  scrapGroups?: string[];
  items: OrderItem[];
  finalTotalWeightKg: number | null;
  finalPayoutInr: number | null;
  paymentMode: PaymentMode | null;
  upiTransactionRef: string | null;
  createdAt: string;
  paidAt?: string | null;
}

export interface PassbookTxn {
  orderId: number;
  orderNumber: string;
  date: string;
  weightKg: number;
  amountInr: number;
  paymentMode: PaymentMode;
  upiTransactionRef: string | null;
}

export interface Passbook {
  gullakTotalEarnings: number;
  totalRecycledKg: number;
  co2SavedKg: number;
  totalPickups: number;
  transactions: PassbookTxn[];
}

export interface AuthResult {
  token: string;
  user: User;
  role: Role;
}

export interface RegisterPayload {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  accountType: 'B2C_HOUSEHOLD';
  noidaSector?: string;
}

export interface CreatePickupPayload {
  orderType: OrderType;
  noidaSector: string;
  fullAddress: string;
  gpsLat: number | null;
  gpsLng: number | null;
  scheduledDate: string;
  timeSlot: string;
  estimatedWeightRange: string;
  scrapGroups: string[];
  photoUrl: string | null;
}

export interface WeighingPayload {
  items: { categoryId: number; netWeightKg: number }[];
  paymentMode: PaymentMode;
  upiTransactionRef: string | null;
}

export interface Estimate {
  totalWeightKg: number;
  totalEstimatedPayoutInr: number;
}
