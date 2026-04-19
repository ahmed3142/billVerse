"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  LayoutList,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { toast } from "sonner";

import { MetricPanel } from "@/components/shared/metric-panel";
import { StatusBadge, statusMap } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_OPTIONS } from "@/lib/constants";
import { cn, formatCurrency, formatDateTime, getMonthLabel } from "@/lib/utils";
import type {
  BillingPeriod,
  PaymentStatus,
  PublicStatusResponse,
  PublicStatusRow,
} from "@/types/domain";

type SortKey = "totalDue" | "amountPaid" | "balance";
type SortDirection = "asc" | "desc";

async function fetchStatus(period: BillingPeriod, filter: PaymentStatus | "all") {
  const search = new URLSearchParams({
    month: String(period.month),
    year: String(period.year),
    filter,
  });
  const response = await fetch(`/api/status?${search.toString()}`);

  if (!response.ok) {
    throw new Error("Could not load payment status.");
  }

  return (await response.json()) as PublicStatusResponse;
}

function compareRows(left: PublicStatusRow, right: PublicStatusRow, sortKey: SortKey) {
  const result =
    sortKey === "totalDue"
      ? left.totalDue - right.totalDue
      : sortKey === "amountPaid"
        ? left.amountPaid - right.amountPaid
        : left.balance - right.balance;

  if (result !== 0) {
    return result;
  }

  return left.flatNumber.localeCompare(right.flatNumber, undefined, { numeric: true });
}

function getSortIcon(isActive: boolean, direction: SortDirection) {
  if (!isActive) {
    return ArrowUpDown;
  }

  return direction === "desc" ? ArrowDown : ArrowUp;
}

export function PaymentStatusBoard({
  initialData,
  appHref,
  appLabel,
}: {
  initialData: PublicStatusResponse;
  appHref: string;
  appLabel: string;
}) {
  const [selectedPeriod, setSelectedPeriod] = useState(initialData.period);
  const [filter, setFilter] = useState<PaymentStatus | "all">(initialData.filter);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("balance");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [isExporting, setIsExporting] = useState(false);
  const deferredFilter = useDeferredValue(filter);
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const query = useQuery({
    queryKey: ["status-board", selectedPeriod.year, selectedPeriod.month, deferredFilter],
    queryFn: () => fetchStatus(selectedPeriod, deferredFilter),
    initialData,
    placeholderData: (previousData) => previousData,
  });

  const data = query.data ?? initialData;
  const allFlatCount =
    data.summary.countByStatus.paid +
    data.summary.countByStatus.partial +
    data.summary.countByStatus.pending;
  const counts = {
    all: allFlatCount,
    paid: data.summary.countByStatus.paid,
    partial: data.summary.countByStatus.partial,
    pending: data.summary.countByStatus.pending,
  };

  useEffect(() => {
    if (!query.error) {
      return;
    }

    toast.error(query.error instanceof Error ? query.error.message : "Could not refresh the status board.");
  }, [query.error]);

  const visibleRows = data.rows
    .filter((row) => {
      if (!deferredSearch) {
        return true;
      }

      const haystack = `${row.flatNumber} ${row.ownerName}`.toLowerCase();
      return haystack.includes(deferredSearch);
    })
    .sort((left, right) => {
      const result = compareRows(left, right, sortKey);
      return sortDirection === "asc" ? result : -result;
    });

  const isSearchEmpty = deferredSearch.length > 0 && visibleRows.length === 0;
  const isFilterEmpty = deferredSearch.length === 0 && data.rows.length === 0;

  async function handleExport() {
    setIsExporting(true);

    try {
      const searchParams = new URLSearchParams({
        month: String(selectedPeriod.month),
        year: String(selectedPeriod.year),
        filter: deferredFilter,
      });
      const response = await fetch(`/api/status/export?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error("Export failed. Try again in a moment.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payment-status-${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, "0")}.xlsx`;
      document.body.append(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Payment status export downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  function toggleSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection(sortDirection === "desc" ? "asc" : "desc");
      return;
    }

    setSortKey(nextSortKey);
    setSortDirection("desc");
  }

  function resetView() {
    setSearch("");
    setFilter("all");
    setSelectedPeriod(data.periods[0] ?? initialData.period);
    setSortKey("balance");
    setSortDirection("desc");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-7 sm:gap-8">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="space-y-3">
              <CardEyebrow>Public Collections</CardEyebrow>
              <div>
                <CardTitle className="text-3xl sm:text-4xl">
                  {getMonthLabel(data.period.month, data.period.year)}
                </CardTitle>
                <CardDescription className="mt-2 max-w-2xl leading-7">
                  Published resident balances, payment progress, and outstanding totals for the active billing cycle.
                </CardDescription>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 self-start rounded-full border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)]/90 px-4 py-2 text-sm text-muted shadow-[var(--shadow-soft)] xl:justify-self-end">
              <Sparkles className="h-4 w-4 text-[color:var(--accent)]" />
              <span>
                {data.lastUpdated ? `Last updated ${formatDateTime(data.lastUpdated)}` : "Waiting for the first published update"}
              </span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricPanel
              label="Collected"
              value={formatCurrency(data.summary.totalCollected)}
              tone="success"
              detail="Payments already recorded for this published month."
            />
            <MetricPanel
              label="Total due"
              value={formatCurrency(data.summary.totalDue)}
              tone="primary"
              detail="The combined amount billed across all published statements."
            />
            <MetricPanel
              label="Outstanding"
              value={formatCurrency(data.summary.outstanding)}
              tone="danger"
              detail="Outstanding is the unpaid amount left after subtracting recorded payments from total due."
            />
            <MetricPanel
              label="Collection rate"
              value={`${data.summary.collectionRate}%`}
              tone="accent"
              detail="Collection rate is total collected divided by total due for the selected billing cycle."
            />
          </div>

          <div className="mt-2 space-y-3 rounded-[1.6rem] border border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)]/70 p-4 sm:mt-3 sm:p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[color:var(--foreground)]">Collection progress</p>
                <p className="text-sm text-muted">
                  {formatCurrency(data.summary.totalCollected)} of {formatCurrency(data.summary.totalDue)} collected
                </p>
              </div>
              <p className="text-sm font-semibold text-[color:var(--foreground)]">
                {data.summary.collectionRate}% complete
              </p>
            </div>
            <Progress value={data.summary.collectionRate} />
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="space-y-5 pt-5 sm:pt-6">
          <div className="space-y-5 rounded-[1.6rem] border border-[color:var(--border-strong)] bg-[color:var(--surface)]/94 p-4 shadow-[var(--shadow-strong)] backdrop-blur-xl sm:p-5">
            <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--foreground)]">
                  <LayoutList className="h-4 w-4 text-[color:var(--primary)]" />
                  Payment status board
                </div>
                <p className="max-w-2xl text-sm leading-6 text-muted">
                  Search any flat or owner, switch months, and sort the largest balances to the top for faster follow-up.
                </p>
              </div>

              <div className="grid w-full gap-3 lg:grid-cols-[11rem_minmax(0,1fr)] xl:items-end">
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Month</span>
                  <select
                    value={`${selectedPeriod.year}-${String(selectedPeriod.month).padStart(2, "0")}`}
                    onChange={(event) => {
                      const [year, month] = event.target.value.split("-").map(Number);
                      setSelectedPeriod({ month, year });
                    }}
                    className="h-11 w-full rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--surface)] px-4 text-sm text-[color:var(--foreground)] shadow-[var(--shadow-soft)] outline-none focus:border-[color:var(--primary)]"
                  >
                    {data.periods.map((period) => (
                      <option
                        key={`${period.year}-${period.month}`}
                        value={`${period.year}-${String(period.month).padStart(2, "0")}`}
                      >
                        {getMonthLabel(period.month, period.year)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Search</span>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search flat or owner"
                      className="pl-11"
                    />
                  </div>
                </label>

                <div className="grid gap-3 sm:grid-cols-2 lg:col-span-2 lg:justify-self-end xl:w-auto">
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="w-full sm:min-w-[10.5rem]"
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? "Exporting..." : "Export"}
                  </Button>
                  <Link
                    href={appHref}
                    className={cn(
                      buttonVariants({ size: "lg", variant: "secondary" }),
                      "w-full sm:min-w-[10.5rem] no-underline",
                    )}
                  >
                    {appLabel}
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap">
                {STATUS_OPTIONS.map((option) => {
                  const statusTone =
                    option.value === "all" ? null : statusMap[option.value as PaymentStatus];
                  const StatusIcon = statusTone?.icon;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFilter(option.value)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-[var(--shadow-soft)]",
                        filter === option.value
                          ? option.value === "all"
                            ? "border-transparent bg-[linear-gradient(135deg,var(--primary),var(--accent))] text-[color:var(--primary-foreground)]"
                            : cn("border", statusTone?.className)
                          : "border-[color:var(--border-strong)] bg-[color:var(--surface)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-elevated)]",
                      )}
                    >
                      {StatusIcon ? <StatusIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                      <span>{option.label}</span>
                      <span className="rounded-full bg-[color:rgba(255,255,255,0.18)] px-2 py-0.5 text-xs">
                        {counts[option.value]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                <span>
                  Showing {visibleRows.length} of {counts[filter]} flats
                </span>
                {search ? (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="font-semibold text-[color:var(--primary)]"
                  >
                    Clear search
                  </button>
                ) : null}
              </div>
            </div>

            {query.isFetching ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                  <span>Refreshing data</span>
                  <span>{getMonthLabel(selectedPeriod.month, selectedPeriod.year)}</span>
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ) : null}

            {query.isError ? (
              <div className="flex items-start gap-3 rounded-[1.3rem] border status-pending px-4 py-3 text-sm leading-6">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  Refresh failed, so the board is showing the most recent data we already had.
                </div>
              </div>
            ) : null}
          </div>

          {isSearchEmpty || isFilterEmpty ? (
            <div className="rounded-[1.6rem] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--surface-elevated)]/60 px-6 py-10 text-center">
              <h3 className="font-display text-2xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
                {isSearchEmpty ? "No flats match that search" : "No published rows match this filter"}
              </h3>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted">
                {isSearchEmpty
                  ? "Try a different flat number or owner name, or clear the search to return to the full board."
                  : "Switch to another published month or reset the filters to review the full collection snapshot."}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button type="button" onClick={resetView}>
                  Reset board
                </Button>
                {search ? (
                  <Button type="button" variant="secondary" onClick={() => setSearch("")}>
                    Clear search
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-auto rounded-[1.6rem] border border-[color:var(--border-strong)] bg-[color:var(--surface)] md:block">
                <table className="min-w-[62rem] text-left text-sm">
                  <thead>
                    <tr className="text-muted">
                      <th className="sticky left-0 top-0 z-20 bg-[color:var(--surface)]/95 px-4 py-4 backdrop-blur">
                        Flat
                      </th>
                      <th className="sticky top-0 z-10 bg-[color:var(--surface)]/95 px-4 py-4 backdrop-blur">
                        Owner
                      </th>
                      <th
                        className="sticky top-0 z-10 bg-[color:var(--surface)]/95 px-4 py-4 text-right backdrop-blur"
                        aria-sort={
                          sortKey === "totalDue"
                            ? sortDirection === "desc"
                              ? "descending"
                              : "ascending"
                            : "none"
                        }
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort("totalDue")}
                          className="inline-flex items-center gap-2 font-semibold"
                        >
                          Due
                          {(() => {
                            const Icon = getSortIcon(sortKey === "totalDue", sortDirection);
                            return <Icon className="h-4 w-4" />;
                          })()}
                        </button>
                      </th>
                      <th
                        className="sticky top-0 z-10 bg-[color:var(--surface)]/95 px-4 py-4 text-right backdrop-blur"
                        aria-sort={
                          sortKey === "amountPaid"
                            ? sortDirection === "desc"
                              ? "descending"
                              : "ascending"
                            : "none"
                        }
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort("amountPaid")}
                          className="inline-flex items-center gap-2 font-semibold"
                        >
                          Paid
                          {(() => {
                            const Icon = getSortIcon(sortKey === "amountPaid", sortDirection);
                            return <Icon className="h-4 w-4" />;
                          })()}
                        </button>
                      </th>
                      <th
                        className="sticky top-0 z-10 bg-[color:var(--surface)]/95 px-4 py-4 text-right backdrop-blur"
                        aria-sort={
                          sortKey === "balance"
                            ? sortDirection === "desc"
                              ? "descending"
                              : "ascending"
                            : "none"
                        }
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort("balance")}
                          className="inline-flex items-center gap-2 font-semibold"
                        >
                          Balance
                          {(() => {
                            const Icon = getSortIcon(sortKey === "balance", sortDirection);
                            return <Icon className="h-4 w-4" />;
                          })()}
                        </button>
                      </th>
                      <th className="sticky top-0 z-10 bg-[color:var(--surface)]/95 px-4 py-4 backdrop-blur">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRows.map((row) => (
                      <tr
                        key={row.statementId}
                        className="group border-t border-[color:var(--border)] text-[color:var(--foreground)] hover:bg-[color:var(--surface-elevated)]/60"
                      >
                        <td className="sticky left-0 z-10 bg-[color:var(--surface)] px-4 py-4 font-semibold group-hover:bg-[color:var(--surface-elevated)]/80">
                          {row.flatNumber}
                        </td>
                        <td className="px-4 py-4 text-muted">{row.ownerName}</td>
                        <td className="px-4 py-4 text-right font-medium">{formatCurrency(row.totalDue)}</td>
                        <td className="px-4 py-4 text-right">{formatCurrency(row.amountPaid)}</td>
                        <td className="px-4 py-4 text-right font-semibold text-[color:var(--foreground)]">
                          {formatCurrency(row.balance)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={row.paymentStatus} />
                            {row.paymentDate ? (
                              <span className="text-xs text-muted">{formatDateTime(row.paymentDate)}</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 md:hidden">
                {visibleRows.map((row) => (
                  <div
                    key={row.statementId}
                    className="rounded-[1.6rem] border border-[color:var(--border-strong)] bg-[color:var(--surface)]/92 p-4 shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-xl font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
                          {row.flatNumber}
                        </p>
                        <p className="mt-1 text-sm text-muted">{row.ownerName}</p>
                      </div>
                      <StatusBadge status={row.paymentStatus} />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 rounded-[1.25rem] bg-[color:var(--surface-elevated)]/80 p-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted">Due</p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                          {formatCurrency(row.totalDue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted">Paid</p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                          {formatCurrency(row.amountPaid)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted">Balance</p>
                        <p className="mt-2 text-sm font-semibold text-[color:var(--foreground)]">
                          {formatCurrency(row.balance)}
                        </p>
                      </div>
                    </div>

                    {row.paymentDate ? (
                      <p className="mt-3 text-xs text-muted">Last payment: {formatDateTime(row.paymentDate)}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
