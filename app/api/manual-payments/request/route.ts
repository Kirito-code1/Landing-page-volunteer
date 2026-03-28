import { NextResponse } from "next/server";
import { createManualPaymentRequest } from "@/lib/payments/manual-requests";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

const PREMIUM_PRICE_UZS = Number(process.env.NEXT_PUBLIC_PREMIUM_PRICE_UZS ?? 50000);

type RequestBody = {
  kind?: "donation" | "premium";
  amount?: number;
  payerName?: string;
  payerEmail?: string;
  contactPhone?: string;
  transferReference?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentPath?: string;
  note?: string;
};

export async function POST(request: Request) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON в запросе." }, { status: 400 });
  }

  if (body.kind !== "donation" && body.kind !== "premium") {
    return NextResponse.json({ error: "Неподдерживаемый тип перевода." }, { status: 400 });
  }

  if (!Number.isFinite(body.amount) || Number(body.amount) < 1000) {
    return NextResponse.json({ error: "Сумма должна быть не меньше 1 000 сум." }, { status: 400 });
  }

  const amount = Math.round(Number(body.amount));
  if (body.kind === "premium" && amount !== PREMIUM_PRICE_UZS) {
    return NextResponse.json({ error: "Сумма Premium должна совпадать с ценой тарифа." }, { status: 400 });
  }

  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (body.kind === "premium" && !user) {
    return NextResponse.json({ error: "Для Premium требуется авторизация." }, { status: 401 });
  }

  const created = await createManualPaymentRequest({
    kind: body.kind,
    amountUzs: amount,
    userId: user?.id ?? null,
    payerName: body.payerName?.trim() || user?.user_metadata?.full_name?.toString() || null,
    payerEmail: body.payerEmail?.trim() || user?.email || null,
    contactPhone: body.contactPhone?.trim() || user?.user_metadata?.phone?.toString() || null,
    transferReference: body.transferReference?.trim() || null,
    attachmentUrl: body.attachmentUrl?.trim() || null,
    attachmentName: body.attachmentName?.trim() || null,
    attachmentPath: body.attachmentPath?.trim() || null,
    note: body.note?.trim() || null,
    metadata: {
      source: body.kind === "premium" ? "premium_manual_transfer" : "donate_manual_transfer",
    },
  });

  return NextResponse.json({
    requestId: created.id,
    status: created.status,
  });
}
