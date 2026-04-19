import { clsx, type ClassValue } from "clsx";
import { addMonths, format, setDate } from "date-fns";
import { twMerge } from "tailwind-merge";

import { BILL_DUE_DAY } from "@/lib/constants";
import type {
  BillingPeriod,
  CommonBill,
  IndividualBill,
  PaymentStatus,
} from "@/types/domain";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatShortDate(value: string | Date) {
  return format(new Date(value), "dd MMM yyyy");
}

export function formatDateTime(value: string | Date) {
  return format(new Date(value), "dd MMM yyyy, h:mm a");
}

export function getMonthLabel(month: number, year: number) {
  return format(new Date(year, month - 1, 1), "MMMM yyyy");
}

export function makePeriodKey({ month, year }: BillingPeriod) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function sortPeriodsDescending<T extends BillingPeriod>(items: T[]) {
  return [...items].sort((left, right) =>
    `${right.year}${String(right.month).padStart(2, "0")}`.localeCompare(
      `${left.year}${String(left.month).padStart(2, "0")}`,
    ),
  );
}

export function calculateCommonBillTotal(commonBill: Pick<
  CommonBill,
  | "electricity"
  | "water"
  | "gas"
  | "garbage"
  | "projectSecurity"
  | "cleaner"
  | "others"
>) {
  return roundCurrency(
    commonBill.electricity +
      commonBill.water +
      commonBill.gas +
      commonBill.garbage +
      commonBill.projectSecurity +
      commonBill.cleaner +
      commonBill.others,
  );
}

export function calculateIndividualBillTotal(individualBill: Pick<
  IndividualBill,
  "electricity" | "water" | "gas" | "dishLine" | "internetLine"
>) {
  return roundCurrency(
    individualBill.electricity +
      individualBill.water +
      individualBill.gas +
      individualBill.dishLine +
      individualBill.internetLine,
  );
}

export function calculatePaymentStatus(totalDue: number, amountPaid: number) {
  const normalizedPaid = roundCurrency(amountPaid);
  const normalizedDue = roundCurrency(totalDue);

  if (normalizedPaid <= 0) {
    return "pending" satisfies PaymentStatus;
  }

  if (normalizedPaid >= normalizedDue) {
    return "paid" satisfies PaymentStatus;
  }

  return "partial" satisfies PaymentStatus;
}

export function getBalance(totalDue: number, amountPaid: number) {
  return Math.max(roundCurrency(totalDue - amountPaid), 0);
}

export function getDueDate({ month, year }: BillingPeriod) {
  const nextMonth = addMonths(new Date(year, month - 1, 1), 1);
  return setDate(nextMonth, BILL_DUE_DAY);
}

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function clampNumber(value: number, min = 0, max = Number.MAX_SAFE_INTEGER) {
  return Math.min(Math.max(value, min), max);
}
