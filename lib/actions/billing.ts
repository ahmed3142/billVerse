"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { cacheTags, invalidateBillingTags } from "@/lib/cache";
import {
  markNotificationsRead,
  publishBills,
  recordPayment,
  saveCommonBill,
  saveFlat,
  saveIndividualBills,
} from "@/lib/data-service";
import { flatSchema, billRowsSchema, commonBillSchema, paymentSchema, publishSchema } from "@/lib/validators";
import type { CommonBillInput, FlatInput, IndividualBillInput, PaymentInput } from "@/types/domain";

function refreshSharedPaths() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/bills/new");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/flats");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/notifications");
  revalidatePath("/status");
}

export async function saveCommonBillAction(input: CommonBillInput) {
  await requireRole("admin");
  const parsed = commonBillSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Common bill data is invalid.");
  }

  const result = await saveCommonBill(parsed.data);
  invalidateBillingTags({
    month: parsed.data.month,
    year: parsed.data.year,
  });
  refreshSharedPaths();
  return result;
}

export async function saveIndividualBillsAction(input: IndividualBillInput[]) {
  await requireRole("admin");
  const parsed = billRowsSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("One or more individual bill rows are invalid.");
  }

  const result = await saveIndividualBills(parsed.data);
  if (parsed.data[0]) {
    invalidateBillingTags({
      month: parsed.data[0].month,
      year: parsed.data[0].year,
    });
  }
  refreshSharedPaths();
  return result;
}

export async function publishBillsAction(input: { month: number; year: number }) {
  await requireRole("admin");
  const parsed = publishSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid billing period.");
  }

  const result = await publishBills(parsed.data);
  invalidateBillingTags({
    month: parsed.data.month,
    year: parsed.data.year,
  });
  refreshSharedPaths();
  return result;
}

export async function recordPaymentAction(input: PaymentInput) {
  const user = await requireRole("admin");
  const parsed = paymentSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Payment input is invalid.");
  }

  const result = await recordPayment(parsed.data, user.id);
  invalidateBillingTags({
    month: result.month,
    year: result.year,
  });
  refreshSharedPaths();
  return result;
}

export async function saveFlatAction(input: FlatInput) {
  await requireRole("admin");
  const parsed = flatSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Flat information is invalid.");
  }

  const result = await saveFlat({
    ...parsed.data,
    email: parsed.data.email || undefined,
  });
  revalidateTag(cacheTags.flats, "max");
  revalidateTag(cacheTags.adminDashboard, "max");
  refreshSharedPaths();
  return result;
}

export async function markNotificationsReadAction() {
  const user = await requireRole(["admin", "user"]);
  await markNotificationsRead(user.id);
  refreshSharedPaths();
}
