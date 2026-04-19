import { unstable_cache } from "next/cache";

import { cacheTags } from "@/lib/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  calculateCommonBillTotal,
  calculateIndividualBillTotal,
  calculatePaymentStatus,
  clampNumber,
  getBalance,
  getMonthLabel,
  roundCurrency,
  sortPeriodsDescending,
} from "@/lib/utils";
import type {
  BillingPeriod,
  BillEntryRow,
  CommonBill,
  CommonBillBreakdown,
  CommonBillInput,
  Flat,
  FlatInput,
  IndividualBill,
  IndividualBillInput,
  MonthlyStatement,
  Notification,
  PaymentInput,
  PaymentStatus,
  Flat as FlatType,
  PaymentHistory,
  PublicStatusResponse,
} from "@/types/domain";

type DbFlatRow = {
  id: string;
  flat_number: string;
  owner_name: string;
  phone: string | null;
  email: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

type DbCommonBillRow = {
  id: string;
  month: number;
  year: number;
  electricity: number | null;
  water: number | null;
  gas: number | null;
  garbage: number | null;
  project_security: number | null;
  cleaner: number | null;
  others: number | null;
  is_published: boolean | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DbIndividualBillRow = {
  id: string;
  flat_id: string;
  month: number;
  year: number;
  electricity: number | null;
  water: number | null;
  gas: number | null;
  dish_line: number | null;
  internet_line: number | null;
  created_at: string | null;
  updated_at: string | null;
};

type DbMonthlyStatementRow = {
  id: string;
  flat_id: string;
  month: number;
  year: number;
  common_share: number | null;
  individual_total: number | null;
  previous_due: number | null;
  total_due: number | null;
  amount_paid: number | null;
  payment_status: PaymentStatus | null;
  payment_date: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DbPaymentHistoryRow = {
  id: string;
  flat_id: string;
  statement_id: string;
  amount: number | null;
  payment_date: string | null;
  payment_method: PaymentHistory["paymentMethod"] | null;
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
};

type DbNotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

type ServerSupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const ZERO_COMMON_BREAKDOWN: CommonBillBreakdown = {
  electricity: 0,
  water: 0,
  gas: 0,
  garbage: 0,
  projectSecurity: 0,
  cleaner: 0,
  others: 0,
};

function toNumber(value: number | null | undefined) {
  return Number(value ?? 0);
}

function nowIso() {
  return new Date().toISOString();
}

function getLatestTimestamp(values: Array<string | null | undefined>) {
  const timestamps = values
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (timestamps.length === 0) {
    return null;
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function getCurrentPeriod() {
  const now = new Date();
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

function dedupePeriods(periods: BillingPeriod[]) {
  const seen = new Set<string>();
  return periods.filter((period) => {
    const key = `${period.year}-${String(period.month).padStart(2, "0")}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function ensurePeriod(periods: BillingPeriod[], target: BillingPeriod) {
  return dedupePeriods(sortPeriodsDescending([target, ...periods]));
}

function getPreviousPeriod(period: BillingPeriod) {
  if (period.month === 1) {
    return { month: 12, year: period.year - 1 };
  }

  return { month: period.month - 1, year: period.year };
}

function sortFlats(flats: FlatType[]) {
  return [...flats].sort((left, right) =>
    left.flatNumber.localeCompare(right.flatNumber, undefined, { numeric: true }),
  );
}

function mapFlat(row: DbFlatRow): Flat {
  return {
    id: row.id,
    flatNumber: row.flat_number,
    ownerName: row.owner_name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at ?? nowIso(),
  };
}

function mapCommonBill(row: DbCommonBillRow): CommonBill {
  return {
    id: row.id,
    month: row.month,
    year: row.year,
    electricity: toNumber(row.electricity),
    water: toNumber(row.water),
    gas: toNumber(row.gas),
    garbage: toNumber(row.garbage),
    projectSecurity: toNumber(row.project_security),
    cleaner: toNumber(row.cleaner),
    others: toNumber(row.others),
    isPublished: Boolean(row.is_published),
    publishedAt: row.published_at,
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? nowIso(),
  };
}

function mapIndividualBill(row: DbIndividualBillRow): IndividualBill {
  return {
    id: row.id,
    flatId: row.flat_id,
    month: row.month,
    year: row.year,
    electricity: toNumber(row.electricity),
    water: toNumber(row.water),
    gas: toNumber(row.gas),
    dishLine: toNumber(row.dish_line),
    internetLine: toNumber(row.internet_line),
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? nowIso(),
  };
}

function getEmptyCommonBill(period: BillingPeriod): CommonBill {
  const timestamp = nowIso();

  return {
    id: `draft-${period.year}-${String(period.month).padStart(2, "0")}`,
    month: period.month,
    year: period.year,
    electricity: 0,
    water: 0,
    gas: 0,
    garbage: 0,
    projectSecurity: 0,
    cleaner: 0,
    others: 0,
    isPublished: false,
    publishedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function getEmptyIndividualBill(flatId: string, period: BillingPeriod): IndividualBill {
  const timestamp = nowIso();

  return {
    id: `draft-${flatId}-${period.year}-${String(period.month).padStart(2, "0")}`,
    flatId,
    month: period.month,
    year: period.year,
    electricity: 0,
    water: 0,
    gas: 0,
    dishLine: 0,
    internetLine: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function getCommonBreakdown(commonBill: CommonBill, activeFlatCount: number): CommonBillBreakdown {
  if (activeFlatCount === 0) {
    return {
      electricity: 0,
      water: 0,
      gas: 0,
      garbage: 0,
      projectSecurity: 0,
      cleaner: 0,
      others: 0,
    };
  }

  return {
    electricity: roundCurrency(commonBill.electricity / activeFlatCount),
    water: roundCurrency(commonBill.water / activeFlatCount),
    gas: roundCurrency(commonBill.gas / activeFlatCount),
    garbage: roundCurrency(commonBill.garbage / activeFlatCount),
    projectSecurity: roundCurrency(commonBill.projectSecurity / activeFlatCount),
    cleaner: roundCurrency(commonBill.cleaner / activeFlatCount),
    others: roundCurrency(commonBill.others / activeFlatCount),
  };
}

function mapStatement(
  row: DbMonthlyStatementRow,
  commonBreakdown: CommonBillBreakdown,
): MonthlyStatement {
  return {
    id: row.id,
    flatId: row.flat_id,
    month: row.month,
    year: row.year,
    commonShare: toNumber(row.common_share),
    commonBreakdown,
    individualTotal: toNumber(row.individual_total),
    previousDue: toNumber(row.previous_due),
    totalDue: toNumber(row.total_due),
    amountPaid: toNumber(row.amount_paid),
    paymentStatus: row.payment_status ?? "pending",
    paymentDate: row.payment_date,
    createdAt: row.created_at ?? nowIso(),
    updatedAt: row.updated_at ?? nowIso(),
  };
}

function mapPayment(row: DbPaymentHistoryRow): PaymentHistory {
  return {
    id: row.id,
    flatId: row.flat_id,
    statementId: row.statement_id,
    amount: toNumber(row.amount),
    paymentDate: row.payment_date ?? nowIso(),
    paymentMethod: row.payment_method ?? "cash",
    notes: row.notes ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at ?? nowIso(),
  };
}

function mapNotification(row: DbNotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message ?? "",
    isRead: Boolean(row.is_read),
    createdAt: row.created_at ?? nowIso(),
  };
}

const getCachedAllPeriods = unstable_cache(
  async () => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("common_bills")
      .select("month, year")
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return dedupePeriods(
      sortPeriodsDescending(
        ((data ?? []) as Array<{ month: number; year: number }>).map((row) => ({
          month: row.month,
          year: row.year,
        })),
      ),
    );
  },
  ["periods", "all"],
  {
    revalidate: 60,
    tags: [cacheTags.periods],
  },
);

const getCachedPublishedPeriods = unstable_cache(
  async () => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("common_bills")
      .select("month, year")
      .eq("is_published", true)
      .order("year", { ascending: false })
      .order("month", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return dedupePeriods(
      sortPeriodsDescending(
        ((data ?? []) as Array<{ month: number; year: number }>).map((row) => ({
          month: row.month,
          year: row.year,
        })),
      ),
    );
  },
  ["periods", "published"],
  {
    revalidate: 60,
    tags: [cacheTags.periods],
  },
);

const getCachedLatestDraftPeriod = unstable_cache(
  async () => {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("common_bills")
      .select("month, year")
      .eq("is_published", false)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return null;
    }

    return data as { month: number; year: number };
  },
  ["periods", "latest-draft"],
  {
    revalidate: 60,
    tags: [cacheTags.periods, cacheTags.adminDashboard],
  },
);

async function fetchPeriods(publishedOnly = false) {
  return publishedOnly ? getCachedPublishedPeriods() : getCachedAllPeriods();
}

async function resolvePeriod(
  requested?: Partial<BillingPeriod>,
  publishedOnly = false,
) {
  if (requested?.month && requested?.year) {
    const periods = await fetchPeriods(publishedOnly);
    return {
      period: { month: requested.month, year: requested.year },
      periods: ensurePeriod(periods, { month: requested.month, year: requested.year }),
    };
  }

  const periods = await fetchPeriods(publishedOnly);
  const period = periods[0] ?? getCurrentPeriod();

  return {
    period,
    periods: ensurePeriod(periods, period),
  };
}

async function getLatestDraftPeriod() {
  return getCachedLatestDraftPeriod();
}

async function getLinkedFlatId(supabase: ServerSupabaseClient, userId: string) {
  const { data, error } = await supabase.from("users").select("flat_id").eq("id", userId).single();

  if (error) {
    throw new Error(error.message);
  }

  const flatId = (data as { flat_id: string | null }).flat_id;

  if (!flatId) {
    throw new Error("This account is not linked to a flat.");
  }

  return flatId;
}

export async function getBillEntryData(requested?: Partial<BillingPeriod>) {
  const supabase = await createSupabaseServerClient();
  const allPeriods = await fetchPeriods(false);
  const draftPeriod = await getLatestDraftPeriod();
  const currentPeriod = getCurrentPeriod();
  const period =
    requested?.month && requested?.year
      ? { month: requested.month, year: requested.year }
      : draftPeriod ?? currentPeriod;
  const periods = ensurePeriod(allPeriods, period);

  const [{ data: flatsData, error: flatsError }, { data: commonBillData, error: commonBillError }, { data: individualData, error: individualError }] =
    await Promise.all([
      supabase
        .from("flats")
        .select("id, flat_number, owner_name, phone, email, is_active, created_at")
        .eq("is_active", true)
        .order("flat_number", { ascending: true }),
      supabase
        .from("common_bills")
        .select("*")
        .eq("month", period.month)
        .eq("year", period.year)
        .maybeSingle(),
      supabase
        .from("individual_bills")
        .select("*")
        .eq("month", period.month)
        .eq("year", period.year),
    ]);

  if (flatsError || commonBillError || individualError) {
    throw new Error(
      flatsError?.message ?? commonBillError?.message ?? individualError?.message ?? "Failed to load billing data.",
    );
  }

  const flats = sortFlats(((flatsData ?? []) as DbFlatRow[]).map(mapFlat));
  const commonBill = commonBillData
    ? mapCommonBill(commonBillData as DbCommonBillRow)
    : getEmptyCommonBill(period);
  const individualLookup = new Map(
    ((individualData ?? []) as DbIndividualBillRow[]).map((row) => {
      const mapped = mapIndividualBill(row);
      return [mapped.flatId, mapped];
    }),
  );

  const previousPeriod = getPreviousPeriod(period);
  const { data: previousStatementsData, error: previousStatementsError } = await supabase
    .from("monthly_statements")
    .select("*")
    .eq("month", previousPeriod.month)
    .eq("year", previousPeriod.year);

  if (previousStatementsError) {
    throw new Error(previousStatementsError.message);
  }

  const previousLookup = new Map(
    ((previousStatementsData ?? []) as DbMonthlyStatementRow[]).map((row) => [
      row.flat_id,
      row,
    ]),
  );

  const commonTotal = calculateCommonBillTotal(commonBill);
  const commonShare =
    flats.length > 0 ? roundCurrency(commonTotal / flats.length) : 0;

  const rows: BillEntryRow[] = flats.map((flat) => {
    const bill = individualLookup.get(flat.id) ?? getEmptyIndividualBill(flat.id, period);
    const previousStatement = previousLookup.get(flat.id);
    const previousDue = previousStatement
      ? getBalance(toNumber(previousStatement.total_due), toNumber(previousStatement.amount_paid))
      : 0;

    return {
      flat,
      bill,
      total: calculateIndividualBillTotal(bill),
      previousDue,
    };
  });

  return {
    period,
    periods,
    commonBill,
    commonTotal,
    commonShare,
    activeFlatCount: flats.length,
    rows,
    isPublished: commonBill.isPublished,
  };
}

export async function saveCommonBill(input: CommonBillInput) {
  const supabase = await createSupabaseServerClient();
  const payload = {
    month: input.month,
    year: input.year,
    electricity: input.electricity,
    water: input.water,
    gas: input.gas,
    garbage: input.garbage,
    project_security: input.projectSecurity,
    cleaner: input.cleaner,
    others: input.others,
    updated_at: nowIso(),
  };

  const { data, error } = await supabase
    .from("common_bills")
    .upsert(payload, { onConflict: "month,year" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapCommonBill(data as DbCommonBillRow);
}

export async function saveIndividualBills(rows: IndividualBillInput[]) {
  if (rows.length === 0) {
    return [];
  }

  const supabase = await createSupabaseServerClient();
  const payload = rows.map((row) => ({
    flat_id: row.flatId,
    month: row.month,
    year: row.year,
    electricity: row.electricity,
    water: row.water,
    gas: row.gas,
    dish_line: row.dishLine,
    internet_line: row.internetLine,
    updated_at: nowIso(),
  }));

  const { data, error } = await supabase
    .from("individual_bills")
    .upsert(payload, { onConflict: "flat_id,month,year" })
    .select("*");

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DbIndividualBillRow[]).map(mapIndividualBill);
}

export async function publishBills(period: BillingPeriod) {
  const supabase = await createSupabaseServerClient();
  const { error: rpcError } = await supabase.rpc("publish_billing_cycle", {
    p_month: period.month,
    p_year: period.year,
  });

  if (rpcError) {
    throw new Error(rpcError.message);
  }

  const { data: statementsData, error: statementsError } = await supabase
    .from("monthly_statements")
    .select("id, flat_id, total_due")
    .eq("month", period.month)
    .eq("year", period.year);

  if (statementsError) {
    throw new Error(`Bills were published, but follow-up data could not be loaded: ${statementsError.message}`);
  }

  const statements = (statementsData ?? []) as Array<{
    id: string;
    flat_id: string;
    total_due: number | null;
  }>;
  const flatIds = [...new Set(statements.map((statement) => statement.flat_id))];
  let notificationsCreated = 0;

  if (flatIds.length > 0) {
    const { data: usersData, error: usersError } = await supabase
      .from("users")
      .select("id, flat_id")
      .in("flat_id", flatIds);

    if (usersError) {
      throw new Error(`Bills were published, but resident notifications could not be prepared: ${usersError.message}`);
    }

    const usersByFlat = new Map<string, string[]>();

    for (const row of (usersData ?? []) as Array<{ id: string; flat_id: string | null }>) {
      if (!row.flat_id) {
        continue;
      }

      const current = usersByFlat.get(row.flat_id) ?? [];
      current.push(row.id);
      usersByFlat.set(row.flat_id, current);
    }

    const timestamp = nowIso();
    const notifications = statements.flatMap((statement) =>
      (usersByFlat.get(statement.flat_id) ?? []).map((userId) => ({
        user_id: userId,
        title: `${getMonthLabel(period.month, period.year)} bill published`,
        message: `Your new statement is ready. Total due: ${toNumber(statement.total_due).toFixed(2)} BDT.`,
        created_at: timestamp,
      })),
    );

    if (notifications.length > 0) {
      const { error: notificationsError } = await supabase.from("notifications").insert(
        notifications as Array<{
          user_id: string;
          title: string;
          message: string;
          created_at: string;
        }>,
      );

      if (notificationsError) {
        throw new Error(`Bills were published, but resident notifications could not be sent: ${notificationsError.message}`);
      }

      notificationsCreated = notifications.length;
    }
  }

  return {
    statementsCreated: statements.length,
    notificationsCreated,
  };
}

function buildCollectionSummary(statements: MonthlyStatement[]) {
  const totalDue = roundCurrency(
    statements.reduce((total, statement) => total + statement.totalDue, 0),
  );
  const totalCollected = roundCurrency(
    statements.reduce((total, statement) => total + statement.amountPaid, 0),
  );

  return {
    totalDue,
    totalCollected,
    outstanding: roundCurrency(totalDue - totalCollected),
    collectionRate: totalDue > 0 ? Math.round((totalCollected / totalDue) * 100) : 0,
    countByStatus: {
      paid: statements.filter((statement) => statement.paymentStatus === "paid").length,
      partial: statements.filter((statement) => statement.paymentStatus === "partial").length,
      pending: statements.filter((statement) => statement.paymentStatus === "pending").length,
    },
  };
}

const getCachedAdminDashboardData = unstable_cache(
  async () => {
    const supabase = createSupabaseAdminClient();
    const publishedPeriods = await getCachedPublishedPeriods();
    const latestPeriod = publishedPeriods[0] ?? null;
    const draftPeriod = (await getCachedLatestDraftPeriod()) ?? getCurrentPeriod();

    const [flatsResult, paymentsResult, statementsResult] = await Promise.all([
      supabase
        .from("flats")
        .select("id, flat_number, owner_name, phone, email, is_active, created_at")
        .eq("is_active", true)
        .order("flat_number", { ascending: true }),
      supabase
        .from("payment_history")
        .select("id, flat_id, statement_id, amount, payment_date, payment_method, notes, created_by, created_at")
        .order("payment_date", { ascending: false })
        .limit(8),
      latestPeriod
        ? supabase
            .from("monthly_statements")
            .select("id, flat_id, month, year, common_share, individual_total, previous_due, total_due, amount_paid, payment_status, payment_date, created_at, updated_at")
            .eq("month", latestPeriod.month)
            .eq("year", latestPeriod.year)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (flatsResult.error || paymentsResult.error || statementsResult.error) {
      throw new Error(
        flatsResult.error?.message ??
          paymentsResult.error?.message ??
          statementsResult.error?.message ??
          "Failed to load dashboard data.",
      );
    }

    const flats = ((flatsResult.data ?? []) as DbFlatRow[]).map(mapFlat);
    const flatLookup = new Map(flats.map((flat) => [flat.id, flat]));
    const statements = ((statementsResult.data ?? []) as DbMonthlyStatementRow[]).map((row) =>
      mapStatement(row, ZERO_COMMON_BREAKDOWN),
    );
    const summary = buildCollectionSummary(statements);
    const topBalances = statements
      .map((statement) => ({
        statement,
        flat: flatLookup.get(statement.flatId) ?? null,
        balance: getBalance(statement.totalDue, statement.amountPaid),
      }))
      .filter((entry) => entry.flat && entry.balance > 0)
      .sort((left, right) => right.balance - left.balance)
      .slice(0, 6);

    const recentPayments = ((paymentsResult.data ?? []) as DbPaymentHistoryRow[]).map((row) => ({
      ...mapPayment(row),
      flat: flatLookup.get(row.flat_id) ?? null,
    }));

    return {
      latestPeriod,
      draftPeriod,
      summary,
      flatCount: flats.length,
      topBalances,
      recentPayments,
    };
  },
  ["admin-dashboard"],
  {
    revalidate: 60,
    tags: [cacheTags.adminDashboard, cacheTags.flats, cacheTags.periods],
  },
);

export async function getAdminDashboardData() {
  return getCachedAdminDashboardData();
}

export async function getPaymentsPageData(requested?: Partial<BillingPeriod>) {
  const supabase = await createSupabaseServerClient();
  const { period, periods } = await resolvePeriod(requested, true);

  const [
    { data: statementsData, error: statementsError },
    { data: flatsData, error: flatsError },
    commonBillRows,
  ] = await Promise.all([
    supabase
      .from("monthly_statements")
      .select("id, flat_id, month, year, common_share, individual_total, previous_due, total_due, amount_paid, payment_status, payment_date, created_at, updated_at")
      .eq("month", period.month)
      .eq("year", period.year),
    supabase
      .from("flats")
      .select("id, flat_number, owner_name, phone, email, is_active, created_at"),
    supabase
      .from("common_bills")
      .select("*")
      .eq("month", period.month)
      .eq("year", period.year)
      .maybeSingle(),
  ]);

  if (statementsError || flatsError || commonBillRows.error) {
    throw new Error(
      statementsError?.message ??
        flatsError?.message ??
        commonBillRows.error?.message ??
        "Failed to load payments.",
    );
  }

  const statementRows = (statementsData ?? []) as DbMonthlyStatementRow[];
  const statementIds = statementRows.map((row) => row.id);
  let paymentsRows: DbPaymentHistoryRow[] = [];

  if (statementIds.length > 0) {
    const { data: paymentHistoryData, error: paymentHistoryError } = await supabase
      .from("payment_history")
      .select("id, flat_id, statement_id, amount, payment_date, payment_method, notes, created_by, created_at")
      .in("statement_id", statementIds)
      .order("payment_date", { ascending: false });

    if (paymentHistoryError) {
      throw new Error(paymentHistoryError.message);
    }

    paymentsRows = (paymentHistoryData ?? []) as DbPaymentHistoryRow[];
  }

  const flatLookup = new Map(
    ((flatsData ?? []) as DbFlatRow[]).map((row) => {
      const flat = mapFlat(row);
      return [flat.id, flat];
    }),
  );

  const commonBill = commonBillRows.data
    ? mapCommonBill(commonBillRows.data as DbCommonBillRow)
    : getEmptyCommonBill(period);
  const activeFlatCount = [...flatLookup.values()].filter((flat) => flat.isActive).length;
  const breakdown = getCommonBreakdown(commonBill, activeFlatCount);
  const paymentGroups = new Map<string, PaymentHistory[]>();

  for (const paymentRow of paymentsRows) {
    const payment = mapPayment(paymentRow);
    const current = paymentGroups.get(payment.statementId) ?? [];
    current.push(payment);
    paymentGroups.set(payment.statementId, current);
  }

  const rows = statementRows
    .map((row) => {
      const statement = mapStatement(row, breakdown);
      const flat = flatLookup.get(statement.flatId);

      if (!flat) {
        return null;
      }

      return {
        statement,
        flat,
        balance: getBalance(statement.totalDue, statement.amountPaid),
        payments: paymentGroups.get(statement.id) ?? [],
      };
    })
    .filter(Boolean)
    .sort((left, right) => left!.flat.flatNumber.localeCompare(right!.flat.flatNumber));

  return {
    period,
    periods,
    rows: rows as Array<{
      statement: MonthlyStatement;
      flat: Flat;
      balance: number;
      payments: PaymentHistory[];
    }>,
    summary: buildCollectionSummary(
      (rows as Array<{ statement: MonthlyStatement }>).map((row) => row.statement),
    ),
  };
}

export async function recordPayment(input: PaymentInput, actorId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: statementData, error: statementError } = await supabase
    .from("monthly_statements")
    .select("*")
    .eq("id", input.statementId)
    .single();

  if (statementError) {
    throw new Error(statementError.message);
  }

  const statementRow = statementData as DbMonthlyStatementRow;
  const remainingBalance = getBalance(
    toNumber(statementRow.total_due),
    toNumber(statementRow.amount_paid),
  );
  const amount = roundCurrency(clampNumber(input.amount, 0, remainingBalance));

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }

  const nextAmountPaid = roundCurrency(toNumber(statementRow.amount_paid) + amount);
  const nextStatus = calculatePaymentStatus(toNumber(statementRow.total_due), nextAmountPaid);
  const timestamp = nowIso();

  const [{ error: paymentInsertError }, { error: statementUpdateError }] = await Promise.all([
    supabase.from("payment_history").insert({
      flat_id: statementRow.flat_id,
      statement_id: statementRow.id,
      amount,
      payment_date: timestamp,
      payment_method: input.paymentMethod,
      notes: input.notes?.trim() || null,
      created_by: actorId,
      created_at: timestamp,
    }),
    supabase
      .from("monthly_statements")
      .update({
        amount_paid: nextAmountPaid,
        payment_status: nextStatus,
        payment_date: timestamp,
        updated_at: timestamp,
      })
      .eq("id", statementRow.id),
  ]);

  if (paymentInsertError || statementUpdateError) {
    throw new Error(paymentInsertError?.message ?? statementUpdateError?.message ?? "Failed to record payment.");
  }

  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .select("id")
    .eq("flat_id", statementRow.flat_id);

  if (usersError) {
    throw new Error(`Payment was recorded, but notifications could not be prepared: ${usersError.message}`);
  }

  const notifications = ((usersData ?? []) as Array<{ id: string }>).map((user) => ({
    user_id: user.id,
    title: "Payment received",
    message: `A payment of ${amount.toFixed(2)} BDT has been recorded.`,
    created_at: timestamp,
  }));

  if (notifications.length > 0) {
    const { error: notificationError } = await supabase.from("notifications").insert(
      notifications as Array<{
        user_id: string;
        title: string;
        message: string;
        created_at: string;
      }>,
    );

    if (notificationError) {
      throw new Error(`Payment was recorded, but notifications could not be sent: ${notificationError.message}`);
    }
  }

  return {
    ...mapStatement(statementRow, {
      electricity: 0,
      water: 0,
      gas: 0,
      garbage: 0,
      projectSecurity: 0,
      cleaner: 0,
      others: 0,
    }),
    amountPaid: nextAmountPaid,
    paymentStatus: nextStatus,
    paymentDate: timestamp,
    updatedAt: timestamp,
  };
}

export async function getFlatsPageData() {
  const supabase = await createSupabaseServerClient();
  const [{ data: flatsData, error: flatsError }, { data: usersData, error: usersError }] =
    await Promise.all([
      supabase
        .from("flats")
        .select("id, flat_number, owner_name, phone, email, is_active, created_at")
        .order("flat_number", { ascending: true }),
      supabase.from("users").select("id, flat_id"),
    ]);

  if (flatsError || usersError) {
    throw new Error(flatsError?.message ?? usersError?.message ?? "Failed to load flats.");
  }

  const userLookup = new Map(
    ((usersData ?? []) as Array<{ id: string; flat_id: string | null }>).map((row) => [
      row.flat_id,
      row.id,
    ]),
  );
  const flats = sortFlats(((flatsData ?? []) as DbFlatRow[]).map(mapFlat));

  return {
    linkedUsers: flats.map((flat) => ({
      flat,
      user: userLookup.has(flat.id) ? { id: userLookup.get(flat.id)! } : null,
    })),
    activeCount: flats.filter((flat) => flat.isActive).length,
    totalCount: flats.length,
  };
}

export async function saveFlat(input: FlatInput) {
  const supabase = await createSupabaseServerClient();
  const timestamp = nowIso();

  if (input.id) {
    const { data, error } = await supabase
      .from("flats")
      .update({
        flat_number: input.flatNumber.trim().toUpperCase(),
        owner_name: input.ownerName.trim(),
        phone: input.phone?.trim() || null,
        email: input.email?.trim().toLowerCase() || null,
        is_active: input.isActive,
      })
      .eq("id", input.id)
      .select("id, flat_number, owner_name, phone, email, is_active, created_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return mapFlat(data as DbFlatRow);
  }

  const { data, error } = await supabase
    .from("flats")
    .insert({
      flat_number: input.flatNumber.trim().toUpperCase(),
      owner_name: input.ownerName.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim().toLowerCase() || null,
      is_active: input.isActive,
      created_at: timestamp,
    })
    .select("id, flat_number, owner_name, phone, email, is_active, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapFlat(data as DbFlatRow);
}

export async function getResidentDashboardData(userId: string) {
  const supabase = await createSupabaseServerClient();
  const flatId = await getLinkedFlatId(supabase, userId);

  const [
    { data: flatData, error: flatError },
    { data: currentStatementData, error: currentStatementError },
    { data: notificationsData, error: notificationsError },
    { count: unreadNotifications, error: unreadNotificationsError },
    { data: paymentsData, error: paymentsError },
    { count: activeFlatCount, error: activeFlatCountError },
  ] = await Promise.all([
    supabase
      .from("flats")
      .select("id, flat_number, owner_name, phone, email, is_active, created_at")
      .eq("id", flatId)
      .single(),
    supabase
      .from("monthly_statements")
      .select("id, flat_id, month, year, common_share, individual_total, previous_due, total_due, amount_paid, payment_status, payment_date, created_at, updated_at")
      .eq("flat_id", flatId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
    supabase
      .from("payment_history")
      .select("id, flat_id, statement_id, amount, payment_date, payment_method, notes, created_by, created_at")
      .eq("flat_id", flatId)
      .order("payment_date", { ascending: false })
      .limit(5),
    supabase
      .from("flats")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true),
  ]);

  if (
    flatError ||
    currentStatementError ||
    notificationsError ||
    unreadNotificationsError ||
    paymentsError ||
    activeFlatCountError
  ) {
    throw new Error(
      flatError?.message ??
        currentStatementError?.message ??
        notificationsError?.message ??
        unreadNotificationsError?.message ??
        paymentsError?.message ??
        activeFlatCountError?.message ??
        "Failed to load dashboard.",
    );
  }

  const flat = mapFlat(flatData as DbFlatRow);
  const notifications = ((notificationsData ?? []) as DbNotificationRow[]).map(mapNotification);
  const payments = ((paymentsData ?? []) as DbPaymentHistoryRow[]).map(mapPayment);
  let currentStatement: MonthlyStatement | null = null;

  if (currentStatementData) {
    const currentStatementRow = currentStatementData as DbMonthlyStatementRow;
    const { data: commonBillData, error: commonBillError } = await supabase
      .from("common_bills")
      .select("*")
      .eq("month", currentStatementRow.month)
      .eq("year", currentStatementRow.year)
      .maybeSingle();

    if (commonBillError) {
      throw new Error(commonBillError.message);
    }

    const commonBill = commonBillData
      ? mapCommonBill(commonBillData as DbCommonBillRow)
      : getEmptyCommonBill({
          month: currentStatementRow.month,
          year: currentStatementRow.year,
        });

    currentStatement = mapStatement(
      currentStatementRow,
      getCommonBreakdown(commonBill, Math.max(activeFlatCount ?? 0, 1)),
    );
  }

  return {
    flat,
    currentStatement,
    notifications,
    payments,
    unreadNotifications: unreadNotifications ?? 0,
  };
}

export async function getBillingHistoryData(userId: string) {
  const supabase = await createSupabaseServerClient();
  const flatId = await getLinkedFlatId(supabase, userId);
  const { data, error } = await supabase
    .from("monthly_statements")
    .select("id, flat_id, month, year, common_share, individual_total, previous_due, total_due, amount_paid, payment_status, payment_date, created_at, updated_at")
    .eq("flat_id", flatId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(12);

  if (error) {
    throw new Error(error.message);
  }

  return {
    history: ((data ?? []) as DbMonthlyStatementRow[]).map((row) =>
      mapStatement(row, ZERO_COMMON_BREAKDOWN),
    ),
  };
}

export async function getNotificationCenterData(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return {
    notifications: ((data ?? []) as DbNotificationRow[]).map(mapNotification),
  };
}

export async function markNotificationsRead(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) {
    throw new Error(error.message);
  }
}

type StatusFilter = PaymentStatus | "all";

export async function getPublicStatusData(
  requested?: Partial<BillingPeriod>,
  filter: StatusFilter = "all",
): Promise<PublicStatusResponse> {
  const { period, periods } = await resolvePeriod(requested, true);
  const getCachedStatusForPeriod = unstable_cache(
    async (statusFilter: StatusFilter) => {
      const supabase = createSupabaseAdminClient();
      const buildStatementsQuery = () =>
        supabase
          .from("monthly_statements")
          .select("id, flat_id, month, year, common_share, individual_total, previous_due, total_due, amount_paid, payment_status, payment_date, created_at, updated_at")
          .eq("month", period.month)
          .eq("year", period.year);

      const [
        { data: allStatementsData, error: allStatementsError },
        { data: filteredStatementsData, error: filteredStatementsError },
        { data: flatsData, error: flatsError },
        commonBillResult,
      ] =
        await Promise.all([
          buildStatementsQuery(),
          statusFilter === "all"
            ? Promise.resolve({ data: null, error: null })
            : buildStatementsQuery().eq("payment_status", statusFilter),
          supabase
            .from("flats")
            .select("id, flat_number, owner_name, phone, email, is_active, created_at"),
          supabase
            .from("common_bills")
            .select("*")
            .eq("month", period.month)
            .eq("year", period.year)
            .maybeSingle(),
        ]);

      if (allStatementsError || filteredStatementsError || flatsError || commonBillResult.error) {
        throw new Error(
          allStatementsError?.message ??
            filteredStatementsError?.message ??
            flatsError?.message ??
            commonBillResult.error?.message ??
            "Failed to load status.",
        );
      }

      const flatLookup = new Map(
        ((flatsData ?? []) as DbFlatRow[]).map((row) => {
          const flat = mapFlat(row);
          return [flat.id, flat];
        }),
      );
      const commonBill = commonBillResult.data
        ? mapCommonBill(commonBillResult.data as DbCommonBillRow)
        : getEmptyCommonBill(period);
      const activeFlatCount = [...flatLookup.values()].filter((flat) => flat.isActive).length;
      const breakdown = getCommonBreakdown(commonBill, activeFlatCount);
      const allStatements = ((allStatementsData ?? []) as DbMonthlyStatementRow[]).map((row) =>
        mapStatement(row, breakdown),
      );
      const visibleStatementRows =
        statusFilter === "all"
          ? ((allStatementsData ?? []) as DbMonthlyStatementRow[])
          : ((filteredStatementsData ?? []) as DbMonthlyStatementRow[]);
      const statements = visibleStatementRows.map((row) =>
        mapStatement(row, breakdown),
      );
      const rows = statements
        .map((statement) => {
          const flat = flatLookup.get(statement.flatId);

          if (!flat) {
            return null;
          }

          return {
            statementId: statement.id,
            flatNumber: flat.flatNumber,
            ownerName: flat.ownerName,
            totalDue: statement.totalDue,
            amountPaid: statement.amountPaid,
            balance: getBalance(statement.totalDue, statement.amountPaid),
            paymentStatus: statement.paymentStatus,
            paymentDate: statement.paymentDate,
          };
        })
        .filter(Boolean)
        .sort((left, right) => left!.flatNumber.localeCompare(right!.flatNumber));

      const lastUpdated = getLatestTimestamp([
        commonBill.updatedAt,
        commonBill.publishedAt,
        ...allStatements.flatMap((statement) => [
          statement.updatedAt,
          statement.paymentDate,
          statement.createdAt,
        ]),
      ]);

      return {
        rows: rows as Array<{
          statementId: string;
          flatNumber: string;
          ownerName: string;
          totalDue: number;
          amountPaid: number;
          balance: number;
          paymentStatus: PaymentStatus;
          paymentDate?: string | null;
        }>,
        summary: buildCollectionSummary(allStatements),
        lastUpdated,
      };
    },
    ["public-status", `${period.year}-${period.month}`, filter],
    {
      revalidate: 60,
      tags: [cacheTags.status(period.month, period.year), cacheTags.statements(period.month, period.year)],
    },
  );
  const cached = await getCachedStatusForPeriod(filter);

  return {
    period,
    periods,
    filter,
    rows: cached.rows,
    summary: cached.summary,
    lastUpdated: cached.lastUpdated,
  };
}

export async function getStatementDocumentData(statementId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: statementData, error: statementError } = await supabase
    .from("monthly_statements")
    .select("*")
    .eq("id", statementId)
    .single();

  if (statementError) {
    throw new Error(statementError.message);
  }

  const statementRow = statementData as DbMonthlyStatementRow;
  const [{ data: flatData, error: flatError }, { data: commonBillData, error: commonBillError }, { data: individualData, error: individualError }, { data: paymentsData, error: paymentsError }] =
    await Promise.all([
      supabase
        .from("flats")
        .select("id, flat_number, owner_name, phone, email, is_active, created_at")
        .eq("id", statementRow.flat_id)
        .single(),
      supabase
        .from("common_bills")
        .select("*")
        .eq("month", statementRow.month)
        .eq("year", statementRow.year)
        .maybeSingle(),
      supabase
        .from("individual_bills")
        .select("*")
        .eq("flat_id", statementRow.flat_id)
        .eq("month", statementRow.month)
        .eq("year", statementRow.year)
        .maybeSingle(),
      supabase
        .from("payment_history")
        .select("*")
        .eq("statement_id", statementId)
        .order("payment_date", { ascending: false }),
    ]);

  if (flatError || commonBillError || individualError || paymentsError) {
    throw new Error(
      flatError?.message ?? commonBillError?.message ?? individualError?.message ?? paymentsError?.message ?? "Failed to build statement document.",
    );
  }

  const flat = mapFlat(flatData as DbFlatRow);
  const commonBill = commonBillData
    ? mapCommonBill(commonBillData as DbCommonBillRow)
    : getEmptyCommonBill({ month: statementRow.month, year: statementRow.year });
  const { data: activeFlatsData, error: activeFlatsError } = await supabase
    .from("flats")
    .select("id")
    .eq("is_active", true);

  if (activeFlatsError) {
    throw new Error(activeFlatsError.message);
  }

  const activeFlatCount = (activeFlatsData ?? []).length;
  const breakdown = getCommonBreakdown(commonBill, activeFlatCount);
  const statement = mapStatement(statementRow, breakdown);
  const individualBill = individualData
    ? mapIndividualBill(individualData as DbIndividualBillRow)
    : getEmptyIndividualBill(statement.flatId, {
        month: statement.month,
        year: statement.year,
      });

  return {
    statement,
    flat,
    commonBill,
    individualBill,
    payments: ((paymentsData ?? []) as DbPaymentHistoryRow[]).map(mapPayment),
  };
}
