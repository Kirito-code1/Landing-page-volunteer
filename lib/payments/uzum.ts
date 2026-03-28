import type { PaymentOrderStatus } from "@/lib/payments/types";

const UZS_CURRENCY_CODE = 860;

type RegisterUzumPaymentInput = {
  amountTiyin: number;
  clientId: string;
  merchantOrderId: string;
  paymentDetails: string;
  successUrl: string;
  failureUrl: string;
  locale?: string;
  phoneNumber?: string | null;
  merchantParams?: Record<string, unknown>;
};

type UzumResultEnvelope<T> = {
  errorCode: number;
  message: string;
  result: T;
};

type UzumRegisterResult = {
  orderId: string;
  paymentRedirectUrl: string;
};

type UzumOrderStatusResult = {
  orderId: string;
  status: string;
  amount: number;
  totalAmount: number;
  merchantOrderId: string;
  operations?: Array<{
    operationId: string;
    operationType: string;
    state: string;
  }>;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getUzumConfig() {
  return {
    baseUrl: requireEnv("UZUM_CHECKOUT_API_BASE").replace(/\/$/, ""),
    terminalId: requireEnv("UZUM_CHECKOUT_TERMINAL_ID"),
    apiKey: requireEnv("UZUM_CHECKOUT_API_KEY"),
  };
}

function resolveCheckoutLocale(locale?: string) {
  if (locale?.toLowerCase().startsWith("uz")) return "uz-UZ";
  if (locale?.toLowerCase().startsWith("en")) return "en-EN";
  return "ru-RU";
}

async function uzumRequest<T>(
  path: string,
  body: Record<string, unknown>,
  locale?: string,
) {
  const config = getUzumConfig();
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Terminal-Id": config.terminalId,
      "X-API-Key": config.apiKey,
      "Content-Language": resolveCheckoutLocale(locale),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as UzumResultEnvelope<T> | null;

  if (!response.ok || !payload) {
    throw new Error("Uzum Checkout returned an unreadable response.");
  }

  if (payload.errorCode !== 0) {
    throw new Error(payload.message || "Uzum Checkout returned an error.");
  }

  return payload.result;
}

export async function registerUzumPayment(input: RegisterUzumPaymentInput) {
  const result = await uzumRequest<UzumRegisterResult>(
    "/api/v1/payment/register",
    {
      amount: input.amountTiyin,
      clientId: input.clientId,
      currency: UZS_CURRENCY_CODE,
      paymentDetails: input.paymentDetails,
      orderNumber: input.merchantOrderId,
      successUrl: input.successUrl,
      failureUrl: input.failureUrl,
      viewType: "REDIRECT",
      paymentParams: {
        operationType: "PAYMENT",
        payType: "ONE_STEP",
        force3ds: true,
        ...(input.phoneNumber ? { phoneNumber: input.phoneNumber } : {}),
      },
      merchantParams: input.merchantParams ?? {},
      sessionTimeoutSecs: 900,
    },
    input.locale,
  );

  return {
    providerOrderId: result.orderId,
    redirectUrl: result.paymentRedirectUrl,
    providerPayload: result,
  };
}

export async function getUzumPaymentStatus(orderId: string, locale?: string) {
  return uzumRequest<UzumOrderStatusResult>(
    "/api/v1/payment/getOrderStatus",
    { orderId },
    locale,
  );
}

export function mapUzumOrderStatus(status: string | null | undefined): PaymentOrderStatus {
  switch (status) {
    case "COMPLETED":
      return "paid";
    case "REGISTERED":
    case "AUTHORIZED":
      return "pending";
    case "REFUNDED":
    case "REVERSED":
      return "cancelled";
    case "DECLINED":
      return "failed";
    default:
      return "pending";
  }
}

export function mapUzumOperationState(state: string | null | undefined): PaymentOrderStatus {
  switch (state) {
    case "SUCCESS":
      return "paid";
    case "FAILED":
    case "DECLINED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "pending";
  }
}
