import { NextResponse } from "next/server";
import { getCurrentMonthDonationSummary } from "@/lib/donations/summary";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getCurrentMonthDonationSummary();
    return NextResponse.json(summary, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not load donation summary.",
      },
      { status: 500 },
    );
  }
}
