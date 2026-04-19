import Link from "next/link";

import { UpdatePasswordForm } from "@/components/user/update-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UpdatePasswordPage() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          Open this page from the recovery email, then choose a new password for your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <UpdatePasswordForm />
        <Link href="/login" className="inline-block text-sm font-medium text-[color:var(--primary)]">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
