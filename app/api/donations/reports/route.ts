import { NextResponse } from "next/server";
import { fetchDonationReports } from "@/lib/donations/reports-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitValue = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
    const limit = Number.isFinite(limitValue) && limitValue > 0 ? Math.min(limitValue, 20) : undefined;
    const summaryResult = await fetchDonationReports({
      publishedOnly: true,
    });
    const reportsResult = limit
      ? await fetchDonationReports({
          publishedOnly: true,
          limit,
        })
      : summaryResult;

    return NextResponse.json(
      {
        reports: reportsResult.reports,
        summary: summaryResult.summary,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not load donation reports.",
      },
      { status: 500 },
    );
  }
}
