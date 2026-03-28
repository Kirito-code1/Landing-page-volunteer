import { NextResponse } from "next/server";
import {
  getPremiumWindowEnd,
  hasPremiumAccess,
  hasUsedPremiumTrial,
  needsPremiumStateSync,
  PREMIUM_TRIAL_DAYS,
} from "@/lib/auth/premium";
import { ensurePremiumEntitlementWindow, syncPremiumEntitlement } from "@/lib/payments/orders";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

async function getCanonicalUser(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);

  if (error || !data.user) {
    throw error ?? new Error("User not found.");
  }

  return data.user;
}

export async function POST() {
  const supabase = await createRouteSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Требуется авторизация." }, { status: 401 });
  }

  if (needsPremiumStateSync(user)) {
    await ensurePremiumEntitlementWindow(user.id);
  }

  const canonicalUser = await getCanonicalUser(user.id);

  if (hasPremiumAccess(canonicalUser)) {
    return NextResponse.json(
      { error: "Для этого аккаунта Premium уже активен." },
      { status: 400 },
    );
  }

  if (hasUsedPremiumTrial(canonicalUser)) {
    return NextResponse.json(
      { error: "Пробная версия Premium уже была использована." },
      { status: 400 },
    );
  }

  const activatedAt = new Date();
  const expiresAt = getPremiumWindowEnd(activatedAt, "trial").toISOString();

  await syncPremiumEntitlement(user.id, true, {
    activatedAt,
    days: PREMIUM_TRIAL_DAYS,
    source: "trial",
    markTrialUsed: true,
  });

  return NextResponse.json({
    ok: true,
    expiresAt,
    trialDays: PREMIUM_TRIAL_DAYS,
  });
}
