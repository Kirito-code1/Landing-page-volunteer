import { NextResponse } from "next/server";

const ALLOWED_PROVIDERS = ["click", "payme", "stripe", "paypal"] as const;
type Provider = (typeof ALLOWED_PROVIDERS)[number];

type CheckoutRequest = {
  provider: Provider;
  amount: number;
  currency?: string;
  email?: string;
};

const PROVIDER_TEMPLATE_MAP: Record<Provider, string | undefined> = {
  click: process.env.DONATION_CLICK_URL_TEMPLATE,
  payme: process.env.DONATION_PAYME_URL_TEMPLATE,
  stripe: process.env.DONATION_STRIPE_URL_TEMPLATE,
  paypal: process.env.DONATION_PAYPAL_URL_TEMPLATE,
};

function isValidProvider(value: unknown): value is Provider {
  return typeof value === "string" && ALLOWED_PROVIDERS.includes(value as Provider);
}

function isValidCurrency(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z]{3}$/.test(value);
}

function buildUrlFromTemplate(
  template: string,
  replacements: Record<string, string>,
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, token) => {
    if (!(token in replacements)) {
      return match;
    }
    return encodeURIComponent(replacements[token]);
  });
}

export async function POST(request: Request) {
  let body: CheckoutRequest;

  try {
    body = (await request.json()) as CheckoutRequest;
  } catch {
    return NextResponse.json(
      { error: "Некорректный JSON в запросе." },
      { status: 400 },
    );
  }

  const { provider, amount, email } = body;
  const currency = isValidCurrency(body.currency) ? body.currency : "UZS";

  if (!isValidProvider(provider)) {
    return NextResponse.json(
      { error: "Неподдерживаемый платежный провайдер." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json(
      { error: "Сумма должна быть больше 0." },
      { status: 400 },
    );
  }

  const template = PROVIDER_TEMPLATE_MAP[provider];

  if (!template) {
    return NextResponse.json(
      {
        error:
          "Провайдер еще не настроен. Добавьте URL-шаблон в переменные окружения сервера.",
      },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const orderId = `donation_${Date.now()}_${crypto.randomUUID()}`;
  const returnUrl = `${origin}/donate/success`;
  const cancelUrl = `${origin}/donate/cancel`;

  const redirectUrl = buildUrlFromTemplate(template, {
    amount: String(Math.round(amount)),
    currency,
    orderId,
    email: email ?? "",
    returnUrl,
    cancelUrl,
    origin,
    provider,
  });

  if (!/^https?:\/\//i.test(redirectUrl)) {
    return NextResponse.json(
      { error: "Некорректный URL шаблон оплаты." },
      { status: 500 },
    );
  }

  return NextResponse.json({ redirectUrl });
}
