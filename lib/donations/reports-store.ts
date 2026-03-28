import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  normalizeDonationReport,
  sortDonationReports,
  summarizeDonationReports,
  type DonationReportRecord,
  type DonationReportRow,
  type DonationReportsSummary,
} from "@/lib/donations/reports";

type ReportQueryOptions = {
  limit?: number;
  publishedOnly?: boolean;
};

type DonationReportsResult = {
  reports: DonationReportRecord[];
  summary: DonationReportsSummary;
  missing: boolean;
};

const REPORT_SELECT = [
  "id",
  "title",
  "location",
  "summary",
  "amount_uzs",
  "report_date",
  "bullets",
  "metrics",
  "photos",
  "is_published",
  "created_at",
  "updated_at",
].join(", ");

function isMissingTableError(message: string | undefined) {
  if (!message) {
    return false;
  }

  return /donation_reports/i.test(message) && /relation|table|schema cache|does not exist|PGRST/i.test(message);
}

export async function fetchDonationReports(options: ReportQueryOptions = {}): Promise<DonationReportsResult> {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("donation_reports")
    .select(REPORT_SELECT)
    .order("report_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (options.publishedOnly) {
    query = query.eq("is_published", true);
  }

  if (typeof options.limit === "number" && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error.message)) {
      return {
        reports: [],
        summary: summarizeDonationReports([]),
        missing: true,
      };
    }

    throw error;
  }

  const reports = sortDonationReports(
    (data ?? [])
      .map((row) => normalizeDonationReport(row as DonationReportRow))
      .filter((row): row is DonationReportRecord => row !== null),
  );

  return {
    reports,
    summary: summarizeDonationReports(reports),
    missing: false,
  };
}
