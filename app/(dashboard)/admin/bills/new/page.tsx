import { BillEntryWorkspace } from "@/components/admin/bill-entry-workspace";
import { getBillEntryData } from "@/lib/data-service";

export default async function AdminBillsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const month = Number(params.month);
  const year = Number(params.year);
  const data = await getBillEntryData(
    Number.isFinite(month) && Number.isFinite(year) ? { month, year } : undefined,
  );

  return <BillEntryWorkspace key={`${data.period.year}-${data.period.month}`} {...data} />;
}
