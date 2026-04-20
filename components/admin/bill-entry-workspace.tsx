"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, RotateCcw, X } from "lucide-react";
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
  cn,
  formatCurrency,
  getMonthLabel,
  roundCurrency,
} from "@/lib/utils";
import type {
  BillEntryRow,
  BillingPeriod,
  CommonBill,
  CommonBillFieldKey,
  IndividualBillFieldKey,
} from "@/types/domain";

type CommonBillFormValues = z.infer<typeof commonBillSchema>;

interface BillEntryWorkspaceProps {
  period: BillingPeriod;
  periods: BillingPeriod[];
  commonBill: CommonBill;
  activeFlatCount: number;
  rows: BillEntryRow[];
  isPublished: boolean;
}

const DEFAULT_COMMON_FIELD_KEYS = COMMON_BILL_FIELDS.map((field) => field.key) as CommonBillFieldKey[];
const DEFAULT_INDIVIDUAL_FIELD_KEYS = INDIVIDUAL_BILL_FIELDS.map(
  (field) => field.key,
) as IndividualBillFieldKey[];

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

function CriteriaManager<T extends string>({
  title,
  description,
  visibleFields,
  hiddenFields,
  onAdd,
  onRemove,
  onReset,
  disabled = false,
}: {
  title: string;
  description: string;
  visibleFields: Array<{ key: T; label: string }>;
  hiddenFields: Array<{ key: T; label: string }>;
  onAdd: (key: T) => void;
  onRemove: (key: T) => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-[1.4rem] border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)]/65 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[color:var(--foreground)]">{title}</p>
          <p className="text-sm leading-6 text-muted">{description}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onReset}
          disabled={disabled}
          className="w-full sm:w-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restore defaults
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Visible now</p>
          <div className="flex flex-wrap gap-2">
            {visibleFields.length > 0 ? (
              visibleFields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => onRemove(field.key)}
                  disabled={disabled}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-3 py-1.5 text-xs font-semibold text-[color:var(--foreground)] shadow-[var(--shadow-soft)] transition hover:bg-[color:var(--surface-elevated)]",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  {field.label}
                  <X className="h-3.5 w-3.5" />
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--border-strong)] px-3 py-2 text-sm text-muted">
                No criteria selected. Add one back below to resume editing.
              </div>
            )}
          </div>
        </div>

        {hiddenFields.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Add back</p>
            <div className="flex flex-wrap gap-2">
              {hiddenFields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  onClick={() => onAdd(field.key)}
                  disabled={disabled}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border border-dashed border-[color:var(--border-strong)] bg-transparent px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-[color:var(--primary)] hover:text-[color:var(--foreground)]",
                    disabled && "cursor-not-allowed opacity-60",
                  )}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {field.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
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
  const [visibleCommonFieldKeys, setVisibleCommonFieldKeys] = useState<CommonBillFieldKey[]>(
    DEFAULT_COMMON_FIELD_KEYS,
  );
  const [visibleIndividualFieldKeys, setVisibleIndividualFieldKeys] = useState<
    IndividualBillFieldKey[]
  >(DEFAULT_INDIVIDUAL_FIELD_KEYS);

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
  const visibleCommonFields = COMMON_BILL_FIELDS.filter((field) =>
    visibleCommonFieldKeys.includes(field.key),
  );
  const hiddenCommonFields = COMMON_BILL_FIELDS.filter(
    (field) => !visibleCommonFieldKeys.includes(field.key),
  );
  const visibleIndividualFields = INDIVIDUAL_BILL_FIELDS.filter((field) =>
    visibleIndividualFieldKeys.includes(field.key),
  );
  const hiddenIndividualFields = INDIVIDUAL_BILL_FIELDS.filter(
    (field) => !visibleIndividualFieldKeys.includes(field.key),
  );

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

  const updateBillCell = (flatId: string, key: IndividualBillFieldKey, value: number) => {
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

  const markAllRowsDirty = () => {
    setDirtyFlatIds((current) => [
      ...new Set([...current, ...tableRows.map((row) => row.flat.id)]),
    ]);
  };

  const addCommonField = (fieldKey: CommonBillFieldKey) => {
    setVisibleCommonFieldKeys((current) =>
      DEFAULT_COMMON_FIELD_KEYS.filter((key) => current.includes(key) || key === fieldKey),
    );
  };

  const removeCommonField = (fieldKey: CommonBillFieldKey) => {
    form.setValue(fieldKey, 0, { shouldDirty: true, shouldValidate: true });
    setVisibleCommonFieldKeys((current) => current.filter((key) => key !== fieldKey));
  };

  const restoreCommonFields = () => {
    setVisibleCommonFieldKeys([...DEFAULT_COMMON_FIELD_KEYS]);
  };

  const addIndividualField = (fieldKey: IndividualBillFieldKey) => {
    setVisibleIndividualFieldKeys((current) =>
      DEFAULT_INDIVIDUAL_FIELD_KEYS.filter((key) => current.includes(key) || key === fieldKey),
    );
  };

  const removeIndividualField = (fieldKey: IndividualBillFieldKey) => {
    setTableRows((currentRows) =>
      currentRows.map((row) => ({
        ...row,
        bill: {
          ...row.bill,
          [fieldKey]: 0,
        },
        total: calculateIndividualBillTotal({
          ...row.bill,
          [fieldKey]: 0,
        }),
      })),
    );
    setVisibleIndividualFieldKeys((current) => current.filter((key) => key !== fieldKey));
    markAllRowsDirty();
  };

  const restoreIndividualFields = () => {
    setVisibleIndividualFieldKeys([...DEFAULT_INDIVIDUAL_FIELD_KEYS]);
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
              <CardDescription><br /></CardDescription>
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
          <br />
          <CardContent className="space-y-4">
            <CriteriaManager
              title="Common bill criteria"
              description=""
              visibleFields={visibleCommonFields}
              hiddenFields={hiddenCommonFields}
              onAdd={addCommonField}
              onRemove={removeCommonField}
              onReset={restoreCommonFields}
              disabled={isPublished}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              {visibleCommonFields.map((field) => (
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
              <CardDescription><br /></CardDescription>
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
            <CardDescription><br /></CardDescription>
          </div>
          <p className="text-sm text-muted">{saveLabel}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <CriteriaManager
            title="Individual bill criteria"
            description=""
            visibleFields={visibleIndividualFields}
            hiddenFields={hiddenIndividualFields}
            onAdd={addIndividualField}
            onRemove={removeIndividualField}
            onReset={restoreIndividualFields}
            disabled={isPublished}
          />

          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border)] text-muted">
                  <th className="px-3 py-3 font-medium">Flat</th>
                  {visibleIndividualFields.map((field) => (
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
                    {visibleIndividualFields.map((field) => (
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
                  {visibleIndividualFields.map((field) => (
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
