"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const DEFAULT_REFRESH_INTERVAL_MS = 60_000;

export function RouteWarmup({
  routes,
  refreshIntervalMs = DEFAULT_REFRESH_INTERVAL_MS,
}: {
  routes: string[];
  refreshIntervalMs?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const routeList = useMemo(() => {
    const currentSearch = searchParams.toString();
    const currentRoute = currentSearch ? `${pathname}?${currentSearch}` : pathname;

    return [...new Set([currentRoute, ...routes])];
  }, [pathname, routes, searchParams]);

  useEffect(() => {
    const warmRoutes = () => {
      for (const route of routeList) {
        router.prefetch(route);
      }
    };

    warmRoutes();

    const refreshCurrentRoute = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      router.refresh();
      warmRoutes();
    };

    const interval = window.setInterval(refreshCurrentRoute, refreshIntervalMs);

    window.addEventListener("focus", refreshCurrentRoute);
    document.addEventListener("visibilitychange", refreshCurrentRoute);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshCurrentRoute);
      document.removeEventListener("visibilitychange", refreshCurrentRoute);
    };
  }, [refreshIntervalMs, routeList, router]);

  return null;
}
