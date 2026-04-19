import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardPageSkeleton({
  showActions = false,
}: {
  showActions?: boolean;
}) {
  return (
    <div className="space-y-7">
      {showActions ? (
        <div className="flex flex-wrap justify-start gap-3 sm:justify-end">
          <Skeleton className="h-11 w-36 rounded-2xl" />
          <Skeleton className="h-11 w-40 rounded-2xl" />
        </div>
      ) : null}

      <Card>
        <CardHeader className="gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-52" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </CardHeader>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-[1.6rem]" />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader className="gap-4">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-[1.4rem]" />
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-56 max-w-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-[1.4rem]" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
