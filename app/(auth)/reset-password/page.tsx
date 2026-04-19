import Link from "next/link";

import { ResetPasswordRequestForm } from "@/components/user/reset-password-request-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Password reset</CardTitle>
        <CardDescription>
          Send a recovery email to the address assigned to your admin or resident account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <ResetPasswordRequestForm />
        <Link href="/login" className="inline-block text-sm font-medium text-[color:var(--primary)]">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
