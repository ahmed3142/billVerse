import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

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

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(
    data.rows.map((row) => ({
      Flat: row.flatNumber,
      Owner: row.ownerName,
      TotalDue: row.totalDue,
      AmountPaid: row.amountPaid,
      Balance: row.balance,
      Status: row.paymentStatus,
      PaymentDate: row.paymentDate ?? "",
    })),
  );

  XLSX.utils.book_append_sheet(workbook, worksheet, "Payment Status");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="payment-status-${data.period.year}-${String(
        data.period.month,
      ).padStart(2, "0")}.xlsx"`,
    },
  });
}
