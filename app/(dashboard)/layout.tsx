import { AppShell } from "@/components/shared/app-shell";
import { getNavigationItems } from "@/lib/constants";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireSession();

  return <AppShell user={user} navItems={getNavigationItems(user)}>{children}</AppShell>;
}
