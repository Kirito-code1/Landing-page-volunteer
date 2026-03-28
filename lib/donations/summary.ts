import { formatTiyinToUzs } from "@/lib/payments/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const DONATION_TIME_ZONE = "Asia/Tashkent";
const DONATION_TIME_ZONE_OFFSET = "+05:00";

export const DONATION_MONTHLY_GOAL_UZS = Number(
  process.env.NEXT_PUBLIC_DONATION_MONTHLY_GOAL_UZS ??
    process.env.DONATION_MONTHLY_GOAL_UZS ??
    50000000,
);

function isMissingTableError(message: string | undefined, relation: string) {
  if (!message) {
    return false;
  }

  return new RegExp(relation, "i").test(message) && /relation|table|schema cache|does not exist|PGRST/i.test(message);
}

function getMonthParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DONATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(map.get("year") ?? "1970"),
    month: Number(map.get("month") ?? "1"),
  };
}

function getCurrentMonthRange(now = new Date()) {
  const { year, month } = getMonthParts(now);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextMonthYear = month === 12 ? year + 1 : year;
  const monthLabel = `${year}-${String(month).padStart(2, "0")}`;

  const startIso = new Date(
    `${year}-${String(month).padStart(2, "0")}-01T00:00:00${DONATION_TIME_ZONE_OFFSET}`,
  ).toISOString();
  const endIso = new Date(
    `${nextMonthYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00${DONATION_TIME_ZONE_OFFSET}`,
  ).toISOString();

  return {
    monthLabel,
    startIso,
    endIso,
  };
}

export type DonationMonthlySummary = {
  monthLabel: string;
  goalAmountUzs: number;
  collectedAmountUzs: number;
  remainingAmountUzs: number;
  progressPercent: number;
  approvedPaymentsCount: number;
};

export async function getCurrentMonthDonationSummary(now = new Date()) {
  const admin = getSupabaseAdmin();
  const range = getCurrentMonthRange(now);

  const [manualResult, ordersResult] = await Promise.all([
    admin
      .from("manual_payment_requests")
      .select("amount_uzs")
      .eq("kind", "donation")
      .eq("status", "approved")
      .gte("reviewed_at", range.startIso)
      .lt("reviewed_at", range.endIso),
    admin
      .from("payment_orders")
      .select("amount_tiyin")
      .eq("kind", "donation")
      .eq("status", "paid")
      .gte("updated_at", range.startIso)
      .lt("updated_at", range.endIso),
  ]);

  let manualRows: Array<{ amount_uzs: number | null }> = [];
  if (manualResult.error) {
    if (!isMissingTableError(manualResult.error.message, "manual_payment_requests")) {
      throw manualResult.error;
    }
  } else {
    manualRows = manualResult.data ?? [];
  }

  let orderRows: Array<{ amount_tiyin: number | null }> = [];
  if (ordersResult.error) {
    if (!isMissingTableError(ordersResult.error.message, "payment_orders")) {
      throw ordersResult.error;
    }
  } else {
    orderRows = ordersResult.data ?? [];
  }

  const manualCollected = manualRows.reduce((sum, item) => {
    return sum + (Number.isFinite(item.amount_uzs) ? Number(item.amount_uzs) : 0);
  }, 0);
  const orderCollected = orderRows.reduce((sum, item) => {
    return sum + (Number.isFinite(item.amount_tiyin) ? formatTiyinToUzs(Number(item.amount_tiyin)) : 0);
  }, 0);

  const collectedAmountUzs = manualCollected + orderCollected;
  const remainingAmountUzs = Math.max(0, DONATION_MONTHLY_GOAL_UZS - collectedAmountUzs);
  const progressPercent =
    DONATION_MONTHLY_GOAL_UZS > 0
      ? Math.min(100, Math.round((collectedAmountUzs / DONATION_MONTHLY_GOAL_UZS) * 100))
      : 0;

  return {
    monthLabel: range.monthLabel,
    goalAmountUzs: DONATION_MONTHLY_GOAL_UZS,
    collectedAmountUzs,
    remainingAmountUzs,
    progressPercent,
    approvedPaymentsCount: manualRows.length + orderRows.length,
  } satisfies DonationMonthlySummary;
}
