import { redirect } from "next/navigation";

import { BrandHero } from "@/components/shared/brand-hero";
import { LoginForm } from "@/components/user/login-form";
import { Card, CardContent, CardDescription, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSessionUser();

  if (session) {
    redirect(session.role === "admin" ? "/admin/dashboard" : "/dashboard");
  }

  return (
    <div className="grid w-full max-w-6xl gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <BrandHero
        className="h-full"
        eyebrow="Account Access"
        title="Sign in to the building workspace."
        description="Admins publish monthly bills and record payments here. Residents use the same account system to review statements, history, notifications, and the public collection board."
        metrics={[
          { label: "For admins", value: "Publish & collect" },
          { label: "For residents", value: "Review & track" },
          { label: "Shared access", value: "One account system" },
        ]}
      />

      <Card className="h-full">
        <CardHeader className="space-y-3">
          <CardEyebrow>{APP_NAME}</CardEyebrow>
          <CardTitle>Account access</CardTitle>
          <CardDescription>
            Use your existing building account, or create one with the email assigned to your flat.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
