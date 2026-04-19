import { ThemeToggle } from "@/components/shared/theme-toggle";
import { StatusBoardSkeleton } from "@/components/user/status-board-skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-app">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
        <StatusBoardSkeleton />
      </div>
    </main>
  );
}
