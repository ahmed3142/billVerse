import { revalidateTag } from "next/cache";

export const cacheTags = {
  flats: "flats",
  periods: "periods",
  adminDashboard: "admin-dashboard",
  userDashboard: (userId: string) => `user-dashboard:${userId}`,
  notifications: (userId: string) => `notifications:${userId}`,
  status: (month: number, year: number) => `status:${year}-${month}`,
  statements: (month: number, year: number) => `statements:${year}-${month}`,
  billEntry: (month: number, year: number) => `bill-entry:${year}-${month}`,
};

export const redisKeys = {
  flats: "flats:all",
  userDashboard: (userId: string) => `dashboard:user:${userId}`,
  status: (month: number, year: number) => `status:${year}-${month}`,
  statements: (month: number, year: number) => `statements:${year}-${month}`,
};

export async function withRedisCache<T>(
  key: string,
  fallback: () => Promise<T>,
  ttlSeconds: number,
) {
  if (!process.env.KV_REST_API_URL) {
    return fallback();
  }

  const { kv } = await import("@vercel/kv");
  const cached = await kv.get<T>(key);

  if (cached) {
    return cached;
  }

  const value = await fallback();
  await kv.set(key, value, { ex: ttlSeconds });
  return value;
}

export async function bustRedisKeys(keys: string[]) {
  if (!process.env.KV_REST_API_URL) {
    return;
  }

  const { kv } = await import("@vercel/kv");
  await Promise.all(keys.map((key) => kv.del(key)));
}

export function invalidateBillingTags({
  month,
  year,
  userIds = [],
}: {
  month: number;
  year: number;
  userIds?: string[];
}) {
  revalidateTag(cacheTags.flats, "max");
  revalidateTag(cacheTags.periods, "max");
  revalidateTag(cacheTags.adminDashboard, "max");
  revalidateTag(cacheTags.billEntry(month, year), "max");
  revalidateTag(cacheTags.status(month, year), "max");
  revalidateTag(cacheTags.statements(month, year), "max");

  for (const userId of userIds) {
    revalidateTag(cacheTags.userDashboard(userId), "max");
    revalidateTag(cacheTags.notifications(userId), "max");
  }
}
