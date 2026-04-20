"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { saveFlatAction } from "@/lib/actions/billing";
import { flatSchema } from "@/lib/validators";

type FlatFormValues = z.infer<typeof flatSchema>;

export function FlatsManager({
  linkedUsers,
  totalCount,
  activeCount,
}: {
  linkedUsers: Array<{
    flat: {
      id: string;
      flatNumber: string;
      ownerName: string;
      phone?: string;
      email?: string;
      isActive: boolean;
    };
    user: {
      id: string;
    } | null;
  }>;
  totalCount: number;
  activeCount: number;
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const form = useForm<FlatFormValues>({
    resolver: zodResolver(flatSchema),
    defaultValues: {
      flatNumber: "",
      ownerName: "",
      phone: "",
      email: "",
      isActive: true,
    },
  });
  const editingId = useWatch({ control: form.control, name: "id" });

  const startEdit = (flat: (typeof linkedUsers)[number]["flat"]) => {
    form.reset({
      id: flat.id,
      flatNumber: flat.flatNumber,
      ownerName: flat.ownerName,
      phone: flat.phone ?? "",
      email: flat.email ?? "",
      isActive: flat.isActive,
    });
  };

  const onSubmit = form.handleSubmit((values) => {
    startSaving(async () => {
      try {
        await saveFlatAction({
          ...values,
          phone: values.phone || undefined,
          email: values.email || undefined,
        });
        toast.success(editingId ? "Flat updated." : "Flat created.");
        form.reset({
          flatNumber: "",
          ownerName: "",
          phone: "",
          email: "",
          isActive: true,
        });
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save flat.");
      }
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Edit flat" : "Add flat"}</CardTitle>
          <CardDescription>
            <br />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="space-y-2 block">
              <span className="text-sm font-medium text-[color:var(--foreground)]">Flat number</span>
              <Input placeholder="1A" {...form.register("flatNumber")} />
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium text-[color:var(--foreground)]">Owner name</span>
              <Input placeholder="Owner name" {...form.register("ownerName")} />
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium text-[color:var(--foreground)]">Phone</span>
              <Input placeholder="+880..." {...form.register("phone")} />
            </label>
            <label className="space-y-2 block">
              <span className="text-sm font-medium text-[color:var(--foreground)]">Resident email</span>
              <Input placeholder="resident@example.com" {...form.register("email")} />
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-[color:var(--border)] px-3 py-2 text-sm text-[color:var(--foreground)]">
              <input type="checkbox" className="h-4 w-4" {...form.register("isActive")} />
              Active for billing
            </label>
            <div className="flex gap-3">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingId ? "Update flat" : "Create flat"}
              </Button>
              {editingId ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    form.reset({
                      flatNumber: "",
                      ownerName: "",
                      phone: "",
                      email: "",
                      isActive: true,
                    })
                  }
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted">Total flats</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {totalCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted">Active flats</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {activeCount}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Flat list</CardTitle>
            <CardDescription><br /></CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {linkedUsers.map(({ flat, user }) => (
              <div
                key={flat.id}
                className="flex flex-col gap-3 rounded-xl border border-[color:var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-[color:var(--foreground)]">
                    {flat.flatNumber} · {flat.ownerName}
                  </p>
                  <p className="text-sm text-muted">{flat.email ?? "No resident email"}</p>
                  <p className="text-sm text-muted">
                    {user ? "App profile linked" : "Waiting for account signup"}
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={() => startEdit(flat)}>
                  Edit
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
