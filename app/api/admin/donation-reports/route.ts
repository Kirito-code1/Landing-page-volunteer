import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  normalizeDonationReport,
  sanitizeDonationReportPayload,
  serializeDonationReportPayload,
  type DonationReportRow,
} from "@/lib/donations/reports";
import { fetchDonationReports } from "@/lib/donations/reports-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return null;
  }

  return user;
}

function normalizeId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export async function GET() {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  }

  try {
    const result = await fetchDonationReports({ publishedOnly: false });
    return NextResponse.json({ reports: result.reports, summary: result.summary });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load reports." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => null);
    const payload = sanitizeDonationReportPayload(body);
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("donation_reports")
      .insert({
        ...serializeDonationReportPayload(payload),
        created_by: user.id,
      })
      .select("id, title, location, summary, amount_uzs, report_date, bullets, metrics, photos, is_published, created_at, updated_at")
      .single();

    if (error) {
      throw error;
    }

    const report = normalizeDonationReport(data as DonationReportRow);
    if (!report) {
      throw new Error("Не удалось сохранить отчёт.");
    }

    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not create report." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => null);
    const reportId = normalizeId((body as { id?: unknown } | null)?.id);
    if (!reportId) {
      throw new Error("Не найден id отчёта.");
    }

    const payload = sanitizeDonationReportPayload(body);
    const admin = getSupabaseAdmin();

    const { data, error } = await admin
      .from("donation_reports")
      .update(serializeDonationReportPayload(payload))
      .eq("id", reportId)
      .select("id, title, location, summary, amount_uzs, report_date, bullets, metrics, photos, is_published, created_at, updated_at")
      .single();

    if (error) {
      throw error;
    }

    const report = normalizeDonationReport(data as DonationReportRow);
    if (!report) {
      throw new Error("Не удалось обновить отчёт.");
    }

    return NextResponse.json({ report });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update report." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Недостаточно прав." }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const reportId = normalizeId(url.searchParams.get("id"));
    if (!reportId) {
      throw new Error("Не найден id отчёта.");
    }

    const admin = getSupabaseAdmin();
    const { data: existing, error: fetchError } = await admin
      .from("donation_reports")
      .select("photos")
      .eq("id", reportId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    const paths = Array.isArray(existing?.photos)
      ? existing.photos
          .map((item) => (item && typeof item === "object" && typeof (item as { path?: unknown }).path === "string"
            ? (item as { path: string }).path
            : null))
          .filter((value): value is string => Boolean(value))
      : [];

    const { error } = await admin.from("donation_reports").delete().eq("id", reportId);
    if (error) {
      throw error;
    }

    if (paths.length > 0) {
      await admin.storage.from("donation-report-files").remove(paths);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete report." },
      { status: 400 },
    );
  }
}
