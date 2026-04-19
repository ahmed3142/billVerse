import { markNotificationsReadAction } from "@/lib/actions/billing";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getNotificationCenterData } from "@/lib/data-service";
import { formatDateTime } from "@/lib/utils";

export default async function NotificationsPage() {
  const user = await requireRole("user");
  const data = await getNotificationCenterData(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resident"
        title="Notifications"
        description="Bill publication and payment updates."
        actions={
          <form action={markNotificationsReadAction}>
            <Button type="submit" variant="secondary">
              Mark all as read
            </Button>
          </form>
        }
      />

      <div className="grid gap-3">
        {data.notifications.map((notification) => (
          <Card key={notification.id}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[color:var(--foreground)]">{notification.title}</p>
                {!notification.isRead ? (
                  <span className="rounded-lg bg-[color:rgba(37,99,235,0.12)] px-2 py-1 text-xs font-medium text-[color:var(--primary)]">
                    New
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-muted">{notification.message}</p>
              <p className="mt-2 text-xs text-muted">{formatDateTime(notification.createdAt)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
