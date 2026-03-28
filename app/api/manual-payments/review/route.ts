import { NextResponse } from "next/server";
import {
  getManualPaymentReviewerEmail,
  listPendingManualPaymentRequests,
  reviewManualPaymentRequest,
} from "@/lib/payments/manual-requests";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

type ReviewRequestBody = {
  requestId?: string;
  action?: "approve" | "reject";
  reviewNote?: string;
};

async function requireReviewer() {
  const reviewerEmail = getManualPaymentReviewerEmail();
  if (!reviewerEmail) {
    return null;
  }

  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || user.email.toLowerCase() !== reviewerEmail.toLowerCase()) {
    return null;
  }

  return user.email;
}

export async function GET() {
  const reviewer = await requireReviewer();
  if (!reviewer) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  const requests = await listPendingManualPaymentRequests();
  return NextResponse.json({ reviewer, requests });
}

export async function POST(request: Request) {
  const reviewer = await requireReviewer();
  if (!reviewer) {
    return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
  }

  let body: ReviewRequestBody;
  try {
    body = (await request.json()) as ReviewRequestBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON в запросе." }, { status: 400 });
  }

  if (!body.requestId?.trim() || (body.action !== "approve" && body.action !== "reject")) {
    return NextResponse.json({ error: "requestId и action обязательны." }, { status: 400 });
  }

  const reviewed = await reviewManualPaymentRequest({
    requestId: body.requestId.trim(),
    action: body.action,
    reviewerEmail: reviewer,
    reviewNote: body.reviewNote?.trim() || null,
  });

  return NextResponse.json({ request: reviewed });
}
