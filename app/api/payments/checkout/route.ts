import { NextResponse } from "next/server";
import {
  attachCheckoutToOrder,
  createPaymentOrder,
  markPaymentOrderFailed,
} from "@/lib/payments/orders";
import { formatAmountToTiyin, isPaymentKind } from "@/lib/payments/types";
import { registerUzumPayment } from "@/lib/payments/uzum";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

const PREMIUM_PRICE_UZS = Number(process.env.NEXT_PUBLIC_PREMIUM_PRICE_UZS ?? 50000);

type CheckoutRequestBody = {
  kind: "donation" | "premium";
  amount: number;
  locale?: string;
  email?: string;
  donorName?: string;
};

export async function POST(request: Request) {
  let body: CheckoutRequestBody;

  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON в запросе." }, { status: 400 });
  }

  if (!isPaymentKind(body.kind)) {
    return NextResponse.json({ error: "Неподдерживаемый тип платежа." }, { status: 400 });
  }

  if (!Number.isFinite(body.amount) || body.amount < 1000) {
    return NextResponse.json({ error: "Сумма должна быть не меньше 1 000 сум." }, { status: 400 });
  }

  if (body.kind === "premium" && Math.round(body.amount) !== PREMIUM_PRICE_UZS) {
    return NextResponse.json({ error: "Цена Premium не совпадает с серверной конфигурацией." }, { status: 400 });
  }

  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (body.kind === "premium" && !user) {
    return NextResponse.json({ error: "Для оплаты Premium нужно войти в аккаунт." }, { status: 401 });
  }

  const amountTiyin = formatAmountToTiyin(Math.round(body.amount));
  const origin = new URL(request.url).origin;
  const payerEmail = body.email?.trim() || user?.email || null;
  const payerName = body.donorName?.trim() || null;
  const paymentDetails =
    body.kind === "premium"
      ? "Premium access for organizer account"
      : "Donation for volunteer platform";

  const order = await createPaymentOrder({
    kind: body.kind,
    amountTiyin,
    payerEmail,
    payerName,
    paymentDetails,
    userId: user?.id ?? null,
    metadata: {
      source: body.kind === "premium" ? "premium_page" : "donate_page",
    },
  });

  const successPath = body.kind === "premium" ? "/premium/success" : "/donate/success";
  const cancelPath = body.kind === "premium" ? "/premium/cancel" : "/donate/cancel";

  try {
    const checkout = await registerUzumPayment({
      amountTiyin,
      clientId: user?.id ?? payerEmail ?? order.merchant_order_id,
      merchantOrderId: order.merchant_order_id,
      paymentDetails,
      successUrl: `${origin}${successPath}?order=${order.merchant_order_id}`,
      failureUrl: `${origin}${cancelPath}?order=${order.merchant_order_id}`,
      locale: body.locale,
      merchantParams: {
        kind: body.kind,
        merchantOrderId: order.merchant_order_id,
        payerEmail,
      },
    });

    await attachCheckoutToOrder(order.id, {
      providerOrderId: checkout.providerOrderId,
      redirectUrl: checkout.redirectUrl,
      providerPayload: checkout.providerPayload,
    });

    return NextResponse.json({
      redirectUrl: checkout.redirectUrl,
      orderId: order.merchant_order_id,
    });
  } catch (error) {
    await markPaymentOrderFailed(order.id, {
      stage: "checkout_register",
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Не удалось создать checkout в Uzum.",
      },
      { status: 500 },
    );
  }
}
