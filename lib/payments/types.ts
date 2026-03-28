export const PAYMENT_KINDS = ["donation", "premium"] as const;
export const PAYMENT_ORDER_STATUSES = [
  "pending",
  "paid",
  "failed",
  "cancelled",
] as const;

export type PaymentKind = (typeof PAYMENT_KINDS)[number];
export type PaymentOrderStatus = (typeof PAYMENT_ORDER_STATUSES)[number];

export type PaymentOrderRecord = {
  id: string;
  merchant_order_id: string;
  provider_order_id: string | null;
  kind: PaymentKind;
  provider: string;
  status: PaymentOrderStatus;
  provider_status: string | null;
  amount_tiyin: number;
  currency_code: string;
  payer_email: string | null;
  payer_name: string | null;
  user_id: string | null;
  payment_details: string | null;
  redirect_url: string | null;
  premium_activated_at: string | null;
  metadata: Record<string, unknown> | null;
  provider_payload: unknown;
  created_at: string;
  updated_at: string;
};

export function isPaymentKind(value: unknown): value is PaymentKind {
  return typeof value === "string" && PAYMENT_KINDS.includes(value as PaymentKind);
}

export function createMerchantOrderId(kind: PaymentKind) {
  const prefix = kind === "premium" ? "prem" : "don";
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  return `${prefix}_${token}`;
}

export function formatAmountToTiyin(amountUzs: number) {
  return Math.round(amountUzs * 100);
}

export function formatTiyinToUzs(amountTiyin: number) {
  return Math.round(amountTiyin / 100);
}
