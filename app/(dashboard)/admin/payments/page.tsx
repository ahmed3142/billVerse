import { PaymentsManager } from "@/components/admin/payments-manager";
import { getPaymentsPageData } from "@/lib/data-service";

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const month = Number(params.month);
  const year = Number(params.year);
  const data = await getPaymentsPageData(
    Number.isFinite(month) && Number.isFinite(year) ? { month, year } : undefined,
  );

  return <PaymentsManager {...data} />;
}
