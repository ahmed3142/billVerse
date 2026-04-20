"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { MetricPanel } from "@/components/shared/metric-panel";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_METHOD_OPTIONS } from "@/lib/constants";
import { recordPaymentAction } from "@/lib/actions/billing";
import { formatCurrency, formatDateTime, getMonthLabel } from "@/lib/utils";
import type { BillingPeriod, Flat, MonthlyStatement, PaymentHistory, PaymentMethod } from "@/types/domain";

export function PaymentsManager({
  period,
  periods,
  rows,
  summary,
}: {
  period: BillingPeriod;
  periods: BillingPeriod[];
  rows: Array<{
    statement: MonthlyStatement;
    flat: Flat;
    balance: number;
    payments: PaymentHistory[];
  }>;
  summary: {
    totalDue: number;
    totalCollected: number;
    outstanding: number;
    collectionRate: number;
  };
}) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, { amount: string; method: PaymentMethod; notes: string }>>(
    () =>
      Object.fromEntries(
        rows.map((row) => [
          row.statement.id,
          {
            amount: row.balance.toFixed(2),
            method: "cash" satisfies PaymentMethod,
            notes: "",
          },
        ]),
      ),
  );
  const [isSubmitting, startSubmitting] = useTransition();

  const updateDraft = (
    statementId: string,
    field: "amount" | "method" | "notes",
    value: string,
  ) => {
    setDrafts((current) => ({
      ...current,
      [statementId]: {
        ...current[statementId],
        [field]: value,
      },
    }));
  };

  const handlePeriodChange = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    router.push(`/admin/payments?month=${month}&year=${year}`);
  };

  const submitPayment = (statementId: string) => {
    const draft = drafts[statementId];

    startSubmitting(async () => {
      try {
        await recordPaymentAction({
          statementId,
          amount: Number(draft.amount),
          paymentMethod: draft.method,
          notes: draft.notes,
        });
        toast.success("Payment recorded.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not record payment.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Collection summary</CardTitle>
            <CardDescription>{getMonthLabel(period.month, period.year)}</CardDescription>
            <br />
          </div>
          <select
            defaultValue={`${period.year}-${String(period.month).padStart(2, "0")}`}
            onChange={(event) => handlePeriodChange(event.target.value)}
            className="h-10 rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--primary)] focus:ring-4 focus:ring-[color:var(--ring)]"
          >
            {periods.map((option) => (
              <option
                key={`${option.year}-${option.month}`}
                value={`${option.year}-${String(option.month).padStart(2, "0")}`}
              >
                {getMonthLabel(option.month, option.year)}
              </option>
            ))}
          </select>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <MetricPanel
            label="Total billed"
            value={formatCurrency(summary.totalDue)}
            tone="primary"
            detail="Combined amount billed across all statements in the selected month."
          />
          <MetricPanel
            label="Collected"
            value={formatCurrency(summary.totalCollected)}
            tone="success"
            detail="Payments already recorded against the selected month's statements."
          />
          <MetricPanel
            label="Outstanding"
            value={formatCurrency(summary.outstanding)}
            tone="danger"
            detail="Remaining balance still unpaid after recorded collections."
          />
          <MetricPanel
            label="Collection rate"
            value={`${summary.collectionRate}%`}
            tone="accent"
            detail="Collection rate is total collected divided by total billed for the selected month."
          />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {rows.map((row) => (
          <Card key={row.statement.id}>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>
                  Flat {row.flat.flatNumber} · {row.flat.ownerName}
                </CardTitle>
                <CardDescription>
                  Due {formatCurrency(row.statement.totalDue)} · Paid{" "}
                  {formatCurrency(row.statement.amountPaid)} · Balance{" "}
                  {formatCurrency(row.balance)}
                </CardDescription>
              </div>
              <StatusBadge status={row.statement.paymentStatus} />
            </CardHeader>
            <CardContent className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-3 rounded-xl border border-[color:var(--border)] p-4">
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-[color:var(--foreground)]">Amount</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={drafts[row.statement.id]?.amount ?? ""}
                    onChange={(event) => updateDraft(row.statement.id, "amount", event.target.value)}
                  />
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-[color:var(--foreground)]">Method</span>
                  <select
                    value={drafts[row.statement.id]?.method}
                    onChange={(event) => updateDraft(row.statement.id, "method", event.target.value)}
                    className="h-10 w-full rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] px-3 text-sm text-[color:var(--foreground)] outline-none focus:border-[color:var(--primary)] focus:ring-4 focus:ring-[color:var(--ring)]"
                  >
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 block">
                  <span className="text-sm font-medium text-[color:var(--foreground)]">Notes</span>
                  <Textarea
                    value={drafts[row.statement.id]?.notes ?? ""}
                    onChange={(event) => updateDraft(row.statement.id, "notes", event.target.value)}
                    placeholder="Optional"
                  />
                </label>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => submitPayment(row.statement.id)}
                  disabled={isSubmitting || row.balance <= 0}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Record payment
                </Button>
              </div>

              <div className="space-y-3">
                {row.payments.length === 0 ? (
                  <div className="rounded-xl surface-subtle p-4 text-sm text-muted">
                    No payments recorded yet.
                  </div>
                ) : (
                  row.payments.map((payment) => (
                    <div key={payment.id} className="rounded-xl surface-subtle p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-[color:var(--foreground)]">
                          {formatCurrency(payment.amount)}
                        </p>
                        <p className="text-sm text-muted">
                          {formatDateTime(payment.paymentDate)}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        {payment.paymentMethod.replace("_", " ")}
                      </p>
                      {payment.notes ? (
                        <p className="mt-2 text-sm text-muted">{payment.notes}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
