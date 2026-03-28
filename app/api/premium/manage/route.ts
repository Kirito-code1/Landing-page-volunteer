import { NextResponse } from "next/server";
import { syncPremiumEntitlement } from "@/lib/payments/orders";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

type PremiumManageRequestBody = {
  action?: "downgrade";
};

export async function POST(request: Request) {
  let body: PremiumManageRequestBody;

  try {
    body = (await request.json()) as PremiumManageRequestBody;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON в запросе." }, { status: 400 });
  }

  if (body.action !== "downgrade") {
    return NextResponse.json({ error: "Неподдерживаемое действие." }, { status: 400 });
  }

  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  }

  await syncPremiumEntitlement(user.id, false);

  return NextResponse.json({ ok: true });
}
