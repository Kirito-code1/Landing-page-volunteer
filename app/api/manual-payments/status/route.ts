import { NextResponse } from "next/server";
import { getCurrentMonthDonationSummary } from "@/lib/donations/summary";
import { getManualPaymentRequestById } from "@/lib/payments/manual-requests";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

type RequestBody = {
  requestId?: string;
};

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON в запросе." }, { status: 400 });
  }

  const requestId = body.requestId?.trim();
  if (!requestId) {
    return NextResponse.json({ error: "requestId обязателен." }, { status: 400 });
  }

  const paymentRequest = await getManualPaymentRequestById(requestId);
  if (!paymentRequest) {
    return NextResponse.json({ error: "Заявка на перевод не найдена." }, { status: 404 });
  }

  if (paymentRequest.user_id) {
    const supabase = await createRouteSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== paymentRequest.user_id) {
      return NextResponse.json({ error: "Нет доступа к этой заявке." }, { status: 403 });
    }
  }

  const donationSummary =
    paymentRequest.kind === "donation" && paymentRequest.status === "approved"
      ? await getCurrentMonthDonationSummary().catch(() => null)
      : null;

  return NextResponse.json({
    requestId: paymentRequest.id,
    kind: paymentRequest.kind,
    status: paymentRequest.status,
    amount: paymentRequest.amount_uzs,
    premiumActivated: Boolean(paymentRequest.premium_activated_at),
    reviewedAt: paymentRequest.reviewed_at,
    reviewNote: paymentRequest.review_note,
    donationSummary,
  });
}
