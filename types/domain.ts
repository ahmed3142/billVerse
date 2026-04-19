export type UserRole = "admin" | "user";

export type PaymentStatus = "pending" | "partial" | "paid";

export type PaymentMethod =
  | "cash"
  | "bank_transfer"
  | "bkash"
  | "nagad"
  | "card";

export type CommonBillFieldKey =
  | "electricity"
  | "water"
  | "gas"
  | "garbage"
  | "projectSecurity"
  | "cleaner"
  | "others";

export type IndividualBillFieldKey =
  | "electricity"
  | "water"
  | "gas"
  | "dishLine"
  | "internetLine";

export interface BillingPeriod {
  month: number;
  year: number;
}

export interface Flat {
  id: string;
  flatNumber: string;
  ownerName: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CommonBill extends BillingPeriod {
  id: string;
  electricity: number;
  water: number;
  gas: number;
  garbage: number;
  projectSecurity: number;
  cleaner: number;
  others: number;
  isPublished: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IndividualBill extends BillingPeriod {
  id: string;
  flatId: string;
  electricity: number;
  water: number;
  gas: number;
  dishLine: number;
  internetLine: number;
  createdAt: string;
  updatedAt: string;
}

export type CommonBillBreakdown = Record<CommonBillFieldKey, number>;

export interface MonthlyStatement extends BillingPeriod {
  id: string;
  flatId: string;
  commonShare: number;
  commonBreakdown: CommonBillBreakdown;
  individualTotal: number;
  previousDue: number;
  totalDue: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  paymentDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentHistory {
  id: string;
  flatId: string;
  statementId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface CommonBillInput extends BillingPeriod {
  electricity: number;
  water: number;
  gas: number;
  garbage: number;
  projectSecurity: number;
  cleaner: number;
  others: number;
}

export interface IndividualBillInput extends BillingPeriod {
  flatId: string;
  electricity: number;
  water: number;
  gas: number;
  dishLine: number;
  internetLine: number;
}

export interface FlatInput {
  id?: string;
  flatNumber: string;
  ownerName: string;
  phone?: string;
  email?: string;
  isActive: boolean;
}

export interface PaymentInput {
  statementId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface BillEntryRow {
  flat: Flat;
  bill: IndividualBill;
  total: number;
  previousDue: number;
}

export interface PublicStatusRow {
  statementId: string;
  flatNumber: string;
  ownerName: string;
  totalDue: number;
  amountPaid: number;
  balance: number;
  paymentStatus: PaymentStatus;
  paymentDate?: string | null;
}

export interface PublicStatusSummary {
  totalDue: number;
  totalCollected: number;
  outstanding: number;
  collectionRate: number;
  countByStatus: {
    paid: number;
    partial: number;
    pending: number;
  };
}

export interface PublicStatusResponse {
  period: BillingPeriod;
  periods: BillingPeriod[];
  filter: PaymentStatus | "all";
  rows: PublicStatusRow[];
  summary: PublicStatusSummary;
  lastUpdated: string | null;
}

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  flatId?: string;
  flatNumber?: string;
}
