import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-app">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6">
        <div className="mb-8 flex justify-end">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">{children}</div>
      </div>
    </main>
  );
}
