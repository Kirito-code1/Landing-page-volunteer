import { NextResponse } from "next/server";
import {
  getPaymentOrderByMerchantId,
  isTerminalPaymentState,
  syncPaymentOrderStatus,
} from "@/lib/payments/orders";
import { formatTiyinToUzs } from "@/lib/payments/types";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

type PaymentStatusRequestBody = {
  orderId?: string;
};

export async function POST(request: Request) {
  let body: PaymentStatusRequestBody;

  try {
    body = (await request.json()) as PaymentStatusRequestBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON в запросе." }, { status: 400 });
  }

  const orderId = body.orderId?.trim();
  if (!orderId) {
    return NextResponse.json({ error: "orderId обязателен." }, { status: 400 });
  }

  const order = await getPaymentOrderByMerchantId(orderId);
  if (!order) {
    return NextResponse.json({ error: "Платеж не найден." }, { status: 404 });
  }

  if (order.user_id) {
    const supabase = await createRouteSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== order.user_id) {
      return NextResponse.json({ error: "Нет доступа к этому платежу." }, { status: 403 });
    }
  }

  const shouldSync =
    !isTerminalPaymentState(order.status) ||
    (order.kind === "premium" && order.status === "paid" && !order.premium_activated_at);

  const resolvedOrder = shouldSync ? await syncPaymentOrderStatus(order) : order;

  return NextResponse.json({
    orderId: resolvedOrder.merchant_order_id,
    kind: resolvedOrder.kind,
    status: resolvedOrder.status,
    amount: formatTiyinToUzs(resolvedOrder.amount_tiyin),
    currency: resolvedOrder.currency_code,
    premiumActivated: Boolean(resolvedOrder.premium_activated_at),
  });
}
