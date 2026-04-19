import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatusBoardSkeleton() {
  return (
    <div className="space-y-7">
      <Card>
        <CardHeader className="gap-7 sm:gap-8">
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_auto] 2xl:items-end">
            <div className="space-y-3">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-12 w-64 max-w-full" />
              <Skeleton className="h-5 w-[32rem] max-w-full" />
            </div>
            <Skeleton className="h-11 w-60 rounded-full" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-[1.6rem]" />
            ))}
          </div>

          <div className="mt-2 rounded-[1.6rem] border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)]/70 p-4 sm:mt-3 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-56" />
              </div>
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="mt-4 h-3 w-full rounded-full" />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-5 sm:pt-6">
          <div className="space-y-5 rounded-[1.6rem] border border-[color:var(--border-strong)] bg-[color:var(--surface)]/94 p-4 shadow-[var(--shadow-strong)] sm:p-5">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-[26rem] max-w-full" />
              </div>

              <div className="grid w-full gap-3 lg:grid-cols-[11rem_minmax(0,1fr)] xl:items-end">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-11 w-full rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-11 w-full rounded-2xl" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:justify-self-end xl:w-auto">
                  <Skeleton className="h-12 w-full rounded-2xl sm:min-w-[10.5rem]" />
                  <Skeleton className="h-12 w-full rounded-2xl sm:min-w-[10.5rem]" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-24 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-4 w-40" />
            </div>
          </div>

          <div className="hidden space-y-4 md:block">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[4.5rem] rounded-[1.4rem]" />
            ))}
          </div>

          <div className="grid gap-4 md:hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-44 rounded-[1.6rem]" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
