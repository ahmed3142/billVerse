import { Suspense } from "react";

import { AdminRouteWarmup } from "@/components/admin/admin-route-warmup";
import { requireRole } from "@/lib/auth/session";

const ADMIN_PREFETCH_ROUTES = [
  "/admin/dashboard",
  "/admin/bills/new",
  "/admin/payments",
  "/admin/flats",
  "/status",
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireRole("admin");

  return (
    <>
      <Suspense fallback={null}>
        <AdminRouteWarmup routes={ADMIN_PREFETCH_ROUTES} />
      </Suspense>
      {children}
    </>
  );
}
