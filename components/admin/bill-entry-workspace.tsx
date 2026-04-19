"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FocusEvent, useEffect, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { COMMON_BILL_FIELDS, INDIVIDUAL_BILL_FIELDS } from "@/lib/constants";
import {
  publishBillsAction,
  saveCommonBillAction,
  saveIndividualBillsAction,
} from "@/lib/actions/billing";
import { commonBillSchema } from "@/lib/validators";
import {
  calculateCommonBillTotal,
  calculateIndividualBillTotal,
  formatCurrency,
  getMonthLabel,
  roundCurrency,
} from "@/lib/utils";
import type { BillEntryRow, BillingPeriod, CommonBill } from "@/types/domain";

type CommonBillFormValues = z.infer<typeof commonBillSchema>;

interface BillEntryWorkspaceProps {
  period: BillingPeriod;
  periods: BillingPeriod[];
  commonBill: CommonBill;
  activeFlatCount: number;
  rows: BillEntryRow[];
  isPublished: boolean;
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function selectZeroValue(event: FocusEvent<HTMLInputElement>) {
  const input = event.currentTarget;

  if (Number(input.value) !== 0) {
    return;
  }

  window.requestAnimationFrame(() => {
    input.select();
  });
}

export function BillEntryWorkspace({
  period,
  periods,
  commonBill,
  activeFlatCount,
  rows,
  isPublished,
}: BillEntryWorkspaceProps) {
  const router = useRouter();
  const [tableRows, setTableRows] = useState(rows);
  const [dirtyFlatIds, setDirtyFlatIds] = useState<string[]>([]);
  const [lastSaveLabel, setLastSaveLabel] = useState("Saved");
  const [isSavingRows, startSavingRows] = useTransition();
  const [isSavingCommon, startSavingCommon] = useTransition();
  const [isPublishing, startPublishing] = useTransition();

  const form = useForm<CommonBillFormValues>({
    resolver: zodResolver(commonBillSchema),
    defaultValues: commonBill,
  });

  const watchedCommon = useWatch({ control: form.control });
  const commonTotal = calculateCommonBillTotal(
    watchedCommon as unknown as CommonBillFormValues,
  );
  const commonShare =
    activeFlatCount > 0 ? roundCurrency(commonTotal / activeFlatCount) : 0;
  const totalCycleAmount = roundCurrency(
    tableRows.reduce(
      (total, row) =>
        total + calculateIndividualBillTotal(row.bill) + row.previousDue + commonShare,
      0,
    ),
  );
  const saveLabel =
    dirtyFlatIds.length > 0 || isSavingRows ? "Saving..." : lastSaveLabel;

  useEffect(() => {
    if (dirtyFlatIds.length === 0 || isPublished) {
      return;
    }

    const timer = window.setTimeout(() => {
      const payload = tableRows
        .filter((row) => dirtyFlatIds.includes(row.flat.id))
        .map((row) => row.bill);

      startSavingRows(async () => {
        try {
          await saveIndividualBillsAction(payload);
          setDirtyFlatIds([]);
          setLastSaveLabel("Saved");
        } catch (error) {
          setLastSaveLabel("Save failed");
          toast.error(error instanceof Error ? error.message : "Could not save table rows.");
        }
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [dirtyFlatIds, isPublished, tableRows]);

  const handlePeriodChange = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    router.push(`/admin/bills/new?month=${month}&year=${year}`);
  };

  const updateBillCell = (flatId: string, key: keyof BillEntryRow["bill"], value: number) => {
    setTableRows((currentRows) =>
      currentRows.map((row) =>
        row.flat.id === flatId
          ? {
              ...row,
              bill: {
                ...row.bill,
                [key]: value,
              },
              total: calculateIndividualBillTotal({
                ...row.bill,
                [key]: value,
              }),
            }
          : row,
      ),
    );

    setDirtyFlatIds((current) => (current.includes(flatId) ? current : [...current, flatId]));
  };

  const onSaveCommon = form.handleSubmit((values) => {
    startSavingCommon(async () => {
      try {
        await saveCommonBillAction(values);
        toast.success("Common bills saved.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save common bills.");
      }
    });
  });

  const onPublish = () => {
    startPublishing(async () => {
      try {
        await publishBillsAction(period);
        toast.success("Bills published.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Publishing failed.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Common bills</CardTitle>
              <CardDescription>Shared monthly costs for the selected cycle.</CardDescription>
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
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {COMMON_BILL_FIELDS.map((field) => (
                <label key={field.key} className="space-y-2 block">
                  <span className="text-sm font-medium text-[color:var(--foreground)]">{field.label}</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={isPublished}
                    inputMode="decimal"
                    onFocus={selectZeroValue}
                    {...form.register(field.key, {
                      setValueAs: (value) => toNumber(String(value)),
                    })}
                  />
                </label>
              ))}
            </div>
            <div className="rounded-xl surface-subtle p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Total common</span>
                <span className="font-medium text-[color:var(--foreground)]">
                  {formatCurrency(commonTotal)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted">Per flat</span>
                <span className="font-medium text-[color:var(--foreground)]">
                  {formatCurrency(commonShare)}
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={onSaveCommon}
              disabled={isSavingCommon || isPublished}
            >
              {isSavingCommon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save common bills
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Monthly summary</CardTitle>
              <CardDescription>Publish directly once monthly entries are ready.</CardDescription>
            </div>
            <div className="text-right text-sm">
              <p className="text-muted">Table status</p>
              <p className="font-medium text-[color:var(--foreground)]">{saveLabel}</p>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl surface-subtle p-4">
              <p className="text-sm text-muted">Active flats</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {activeFlatCount}
              </p>
            </div>
            <div className="rounded-xl surface-subtle p-4">
              <p className="text-sm text-muted">Cycle value</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {formatCurrency(totalCycleAmount)}
              </p>
            </div>
            <div className="rounded-xl surface-subtle p-4">
              <p className="text-sm text-muted">Period</p>
              <p className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {getMonthLabel(period.month, period.year)}
              </p>
            </div>
            <div className="sm:col-span-3">
              <Button
                type="button"
                className="w-full"
                variant={isPublished ? "secondary" : "default"}
                disabled={isPublished || isSavingRows || isPublishing}
                onClick={onPublish}
              >
                {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isPublished ? "Already published" : "Publish bills"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle>Individual bills</CardTitle>
            <CardDescription>Per-flat charges update automatically after 500ms.</CardDescription>
          </div>
          <p className="text-sm text-muted">{saveLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-muted">
                  <th className="px-3 py-3 font-medium">Flat</th>
                  {INDIVIDUAL_BILL_FIELDS.map((field) => (
                    <th key={field.key} className="px-3 py-3 font-medium">
                      {field.label}
                    </th>
                  ))}
                  <th className="px-3 py-3 font-medium">Previous due</th>
                  <th className="px-3 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.flat.id} className="border-b border-[color:var(--border)] last:border-0">
                    <td className="px-3 py-3">
                      <div className="font-medium text-[color:var(--foreground)]">
                        {row.flat.flatNumber}
                      </div>
                      <div className="text-xs text-muted">{row.flat.ownerName}</div>
                    </td>
                    {INDIVIDUAL_BILL_FIELDS.map((field) => (
                      <td key={field.key} className="px-3 py-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          disabled={isPublished}
                          value={row.bill[field.key]}
                          onFocus={selectZeroValue}
                          onChange={(event) =>
                            updateBillCell(row.flat.id, field.key, toNumber(event.target.value))
                          }
                        />
                      </td>
                    ))}
                    <td className="px-3 py-3 text-muted">{formatCurrency(row.previousDue)}</td>
                    <td className="px-3 py-3 font-medium text-[color:var(--foreground)]">
                      {formatCurrency(calculateIndividualBillTotal(row.bill) + row.previousDue + commonShare)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {tableRows.map((row) => (
              <div key={row.flat.id} className="rounded-xl border border-[color:var(--border)] p-4">
                <div className="mb-3">
                  <p className="font-medium text-[color:var(--foreground)]">{row.flat.flatNumber}</p>
                  <p className="text-sm text-muted">{row.flat.ownerName}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {INDIVIDUAL_BILL_FIELDS.map((field) => (
                    <label key={field.key} className="space-y-2 block">
                      <span className="text-sm font-medium text-[color:var(--foreground)]">
                        {field.label}
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        disabled={isPublished}
                        value={row.bill[field.key]}
                        onFocus={selectZeroValue}
                        onChange={(event) =>
                          updateBillCell(row.flat.id, field.key, toNumber(event.target.value))
                        }
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-3 rounded-xl surface-subtle p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Previous due</span>
                    <span className="text-[color:var(--foreground)]">
                      {formatCurrency(row.previousDue)}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between">
                    <span className="text-muted">Total</span>
                    <span className="font-medium text-[color:var(--foreground)]">
                      {formatCurrency(calculateIndividualBillTotal(row.bill) + row.previousDue + commonShare)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
