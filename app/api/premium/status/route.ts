import { NextResponse } from "next/server";
import { ensurePremiumEntitlementWindow } from "@/lib/payments/orders";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  }

  const result = await ensurePremiumEntitlementWindow(user.id);
  return NextResponse.json(result);
}
