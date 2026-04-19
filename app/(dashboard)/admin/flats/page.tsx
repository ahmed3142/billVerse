import { FlatsManager } from "@/components/admin/flats-manager";
import { getFlatsPageData } from "@/lib/data-service";

export default async function AdminFlatsPage() {
  const data = await getFlatsPageData();

  return <FlatsManager {...data} />;
}
