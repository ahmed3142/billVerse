import { NextRequest, NextResponse } from "next/server";

import { getPublicStatusData } from "@/lib/data-service";
import type { PaymentStatus } from "@/types/domain";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const month = Number(searchParams.get("month"));
  const year = Number(searchParams.get("year"));
  const filter = searchParams.get("filter");

  const data = await getPublicStatusData(
    Number.isFinite(month) && Number.isFinite(year) ? { month, year } : undefined,
    filter === "paid" || filter === "partial" || filter === "pending"
      ? (filter as PaymentStatus)
      : "all",
  );

  return NextResponse.json(data);
}
