import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  addDays,
  addMonthsClamped,
  getPremiumAccessType,
  getPremiumExpiresAt,
  getPremiumExpiryTime,
  getPremiumWindowEnd,
  hasUsedPremiumTrial,
  getPremiumStartedAt,
  getPremiumStartTime,
  PREMIUM_ACCESS_TYPE_KEY,
  PREMIUM_EXPIRES_AT_KEY,
  PREMIUM_STARTED_AT_KEY,
  PREMIUM_TRIAL_DAYS,
  PREMIUM_TRIAL_USED_KEY,
  type PremiumAccessType,
} from "@/lib/auth/premium";
import {
  createMerchantOrderId,
  type PaymentKind,
  type PaymentOrderRecord,
  type PaymentOrderStatus,
} from "@/lib/payments/types";
import {
  getUzumPaymentStatus,
  mapUzumOperationState,
  mapUzumOrderStatus,
} from "@/lib/payments/uzum";

type CreatePaymentOrderInput = {
  kind: PaymentKind;
  amountTiyin: number;
  currencyCode?: string;
  payerEmail?: string | null;
  payerName?: string | null;
  paymentDetails: string;
  userId?: string | null;
  metadata?: Record<string, unknown>;
};

type CallbackPayload = {
  orderId?: string;
  operationState?: string;
  orderNumber?: string;
  [key: string]: unknown;
};

function nowIso() {
  return new Date().toISOString();
}

function isMissingPremiumColumn(message: string) {
  return /premium_priority/i.test(message) && /column|schema cache|does not exist|PGRST204/i.test(message);
}

function isMissingTableError(message: string | undefined, relation: string) {
  if (!message) {
    return false;
  }

  return new RegExp(relation, "i").test(message) && /relation|table|schema cache|does not exist|PGRST/i.test(message);
}

function hasPremiumFlag(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return false;
  }

  return metadata.is_premium === true || metadata.subscription_plan === "premium";
}

function resolveActivationDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getAuthUserById(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);

  if (error || !data.user) {
    throw error ?? new Error("User not found.");
  }

  return data.user;
}

async function getLatestPremiumActivationAt(userId: string) {
  const admin = getSupabaseAdmin();
  const [manualResult, orderResult] = await Promise.all([
    admin
      .from("manual_payment_requests")
      .select("premium_activated_at")
      .eq("user_id", userId)
      .eq("kind", "premium")
      .not("premium_activated_at", "is", null)
      .order("premium_activated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("payment_orders")
      .select("premium_activated_at")
      .eq("user_id", userId)
      .eq("kind", "premium")
      .not("premium_activated_at", "is", null)
      .order("premium_activated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (manualResult.error && !isMissingTableError(manualResult.error.message, "manual_payment_requests")) {
    throw manualResult.error;
  }

  if (orderResult.error && !isMissingTableError(orderResult.error.message, "payment_orders")) {
    throw orderResult.error;
  }

  const candidates = [
    resolveActivationDate(manualResult.data?.premium_activated_at ?? null),
    resolveActivationDate(orderResult.data?.premium_activated_at ?? null),
  ].filter((item): item is Date => item instanceof Date);

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((a, b) => b.getTime() - a.getTime())[0];
}

type SyncPremiumOptions = {
  activatedAt?: string | Date | null;
  months?: number;
  days?: number;
  source?: PremiumAccessType;
  markTrialUsed?: boolean;
};

async function syncEventsPremiumPriority(userId: string, nextPremium: boolean) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("events")
    .update({ premium_priority: nextPremium })
    .eq("user_id", userId);

  if (error && !isMissingPremiumColumn(error.message ?? "")) {
    throw error;
  }
}

export async function syncPremiumEntitlement(
  userId: string,
  nextPremium: boolean,
  options?: SyncPremiumOptions,
) {
  const admin = getSupabaseAdmin();
  const existingUser = await getAuthUserById(userId);
  const nextPlan = nextPremium ? "premium" : "free";
  const months = Math.max(1, Math.floor(options?.months ?? 1));
  const days = options?.days ? Math.max(1, Math.floor(options.days)) : null;
  const now = new Date();
  const explicitActivationDate = resolveActivationDate(options?.activatedAt);
  const accessType = nextPremium ? (options?.source ?? "paid") : null;
  const trialUsed = hasUsedPremiumTrial(existingUser) || options?.markTrialUsed === true || accessType === "trial";
  const nextStartedAt = nextPremium ? (explicitActivationDate ?? now).toISOString() : null;
  const nextExpiresAt =
    nextPremium
      ? (
          days !== null
            ? addDays(explicitActivationDate ?? now, days)
            : addMonthsClamped(explicitActivationDate ?? now, months)
        ).toISOString()
      : null;

  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: {
      ...existingUser.app_metadata,
      is_premium: nextPremium,
      subscription_plan: nextPlan,
      [PREMIUM_STARTED_AT_KEY]: nextStartedAt,
      [PREMIUM_EXPIRES_AT_KEY]: nextExpiresAt,
      [PREMIUM_ACCESS_TYPE_KEY]: accessType,
      [PREMIUM_TRIAL_USED_KEY]: trialUsed,
    },
    user_metadata: {
      ...existingUser.user_metadata,
      is_premium: nextPremium,
      subscription_plan: nextPlan,
      [PREMIUM_STARTED_AT_KEY]: nextStartedAt,
      [PREMIUM_EXPIRES_AT_KEY]: nextExpiresAt,
      [PREMIUM_ACCESS_TYPE_KEY]: accessType,
      [PREMIUM_TRIAL_USED_KEY]: trialUsed,
    },
  });

  if (updateError) {
    throw updateError;
  }

  await syncEventsPremiumPriority(userId, nextPremium);
}

export async function ensurePremiumEntitlementWindow(userId: string) {
  const user = await getAuthUserById(userId);
  const hasFlag = hasPremiumFlag(user.app_metadata) || hasPremiumFlag(user.user_metadata);
  const expiresAt = getPremiumExpiresAt(user);
  const expiryTime = getPremiumExpiryTime(user);
  const startedAt = getPremiumStartedAt(user);
  const startTime = getPremiumStartTime(user);
  const accessType = getPremiumAccessType(user) ?? "paid";
  const now = Date.now();

  if (!hasFlag) {
    return {
      changed: false,
      isPremium: false,
      expiresAt,
    };
  }

  if (expiryTime !== null) {
    if (startTime !== null) {
      const normalizedExpiry = getPremiumWindowEnd(new Date(startTime), accessType);

      if (expiryTime > normalizedExpiry.getTime()) {
        if (normalizedExpiry.getTime() <= now) {
          await syncPremiumEntitlement(userId, false);
          return {
            changed: true,
            isPremium: false,
            expiresAt: null,
            corrected: true,
          };
        }

        await syncPremiumEntitlement(userId, true, {
          activatedAt: startedAt ?? new Date(startTime),
          source: accessType,
          days: accessType === "trial" ? PREMIUM_TRIAL_DAYS : undefined,
        });

        return {
          changed: true,
          isPremium: true,
          expiresAt: normalizedExpiry.toISOString(),
          corrected: true,
        };
      }
    }

    if (startTime === null) {
      const inferredTrialActivation =
        accessType === "trial" ? addDays(new Date(expiryTime), -PREMIUM_TRIAL_DAYS) : null;
      const activationAt = (await getLatestPremiumActivationAt(userId)) ?? inferredTrialActivation ?? new Date();
      const normalizedExpiry = getPremiumWindowEnd(activationAt, accessType);

      if (normalizedExpiry.getTime() <= now) {
        await syncPremiumEntitlement(userId, false);
        return {
          changed: true,
          isPremium: false,
          expiresAt: null,
          backfilled: true,
        };
      }

      await syncPremiumEntitlement(userId, true, {
        activatedAt: activationAt,
        source: accessType,
        days: accessType === "trial" ? PREMIUM_TRIAL_DAYS : undefined,
      });
      return {
        changed: true,
        isPremium: true,
        expiresAt: normalizedExpiry.toISOString(),
        backfilled: true,
      };
    }

    if (expiryTime <= now) {
      await syncPremiumEntitlement(userId, false);
      return {
        changed: true,
        isPremium: false,
        expiresAt: null,
      };
    }

    return {
      changed: false,
      isPremium: true,
      expiresAt,
    };
  }

  const activationAt = (await getLatestPremiumActivationAt(userId)) ?? new Date();
  const nextExpiry = getPremiumWindowEnd(activationAt, accessType);

  if (nextExpiry.getTime() <= now) {
    await syncPremiumEntitlement(userId, false);
    return {
      changed: true,
      isPremium: false,
      expiresAt: null,
      backfilled: true,
    };
  }

  await syncPremiumEntitlement(userId, true, {
    activatedAt: activationAt,
    source: accessType,
    days: accessType === "trial" ? PREMIUM_TRIAL_DAYS : undefined,
  });

  return {
    changed: true,
    isPremium: true,
    expiresAt: nextExpiry.toISOString(),
    backfilled: true,
  };
}

export async function createPaymentOrder(input: CreatePaymentOrderInput) {
  const admin = getSupabaseAdmin();
  const merchantOrderId = createMerchantOrderId(input.kind);

  const { data, error } = await admin
    .from("payment_orders")
    .insert({
      merchant_order_id: merchantOrderId,
      kind: input.kind,
      provider: "uzum_checkout",
      status: "pending",
      amount_tiyin: input.amountTiyin,
      currency_code: input.currencyCode ?? "UZS",
      payer_email: input.payerEmail ?? null,
      payer_name: input.payerName ?? null,
      user_id: input.userId ?? null,
      payment_details: input.paymentDetails,
      metadata: input.metadata ?? {},
      updated_at: nowIso(),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as PaymentOrderRecord;
}

export async function attachCheckoutToOrder(
  orderId: string,
  patch: {
    providerOrderId: string;
    redirectUrl: string;
    providerPayload: unknown;
    providerStatus?: string | null;
  },
) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("payment_orders")
    .update({
      provider_order_id: patch.providerOrderId,
      redirect_url: patch.redirectUrl,
      provider_payload: patch.providerPayload,
      provider_status: patch.providerStatus ?? "REGISTERED",
      updated_at: nowIso(),
    })
    .eq("id", orderId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as PaymentOrderRecord;
}

export async function markPaymentOrderFailed(orderId: string, errorPayload: unknown) {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("payment_orders")
    .update({
      status: "failed",
      provider_payload: errorPayload,
      updated_at: nowIso(),
    })
    .eq("id", orderId);

  if (error) {
    throw error;
  }
}

export async function getPaymentOrderByMerchantId(merchantOrderId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("payment_orders")
    .select("*")
    .eq("merchant_order_id", merchantOrderId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PaymentOrderRecord | null) ?? null;
}

async function updatePaymentOrder(
  orderId: string,
  updates: Record<string, unknown>,
) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("payment_orders")
    .update({ ...updates, updated_at: nowIso() })
    .eq("id", orderId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as PaymentOrderRecord;
}

export async function syncPaymentOrderStatus(order: PaymentOrderRecord) {
  if (!order.provider_order_id) {
    return order;
  }

  const providerResult = await getUzumPaymentStatus(order.provider_order_id);
  const nextStatus = mapUzumOrderStatus(providerResult.status);

  const updates: Record<string, unknown> = {
    status: nextStatus,
    provider_status: providerResult.status,
    provider_payload: providerResult,
  };

  if (
    nextStatus === "paid" &&
    order.kind === "premium" &&
    order.user_id &&
    !order.premium_activated_at
  ) {
    await syncPremiumEntitlement(order.user_id, true, { source: "paid" });
    updates.premium_activated_at = nowIso();
  }

  return updatePaymentOrder(order.id, updates);
}

export async function handleUzumCallback(payload: CallbackPayload) {
  const merchantOrderId = typeof payload.orderNumber === "string" ? payload.orderNumber : null;
  if (!merchantOrderId) {
    return null;
  }

  const existingOrder = await getPaymentOrderByMerchantId(merchantOrderId);
  if (!existingOrder) {
    return null;
  }

  const callbackStatus = mapUzumOperationState(
    typeof payload.operationState === "string" ? payload.operationState : null,
  );

  const updatedOrder = await updatePaymentOrder(existingOrder.id, {
    provider_order_id:
      typeof payload.orderId === "string" ? payload.orderId : existingOrder.provider_order_id,
    provider_status:
      typeof payload.operationState === "string"
        ? payload.operationState
        : existingOrder.provider_status,
    status: callbackStatus,
    provider_payload: payload,
  });

  if (updatedOrder.provider_order_id) {
    return syncPaymentOrderStatus(updatedOrder);
  }

  if (
    callbackStatus === "paid" &&
    updatedOrder.kind === "premium" &&
    updatedOrder.user_id &&
    !updatedOrder.premium_activated_at
  ) {
    await syncPremiumEntitlement(updatedOrder.user_id, true, { source: "paid" });
    return updatePaymentOrder(updatedOrder.id, {
      premium_activated_at: nowIso(),
    });
  }

  return updatedOrder;
}

export function isTerminalPaymentState(status: PaymentOrderStatus) {
  return status === "paid" || status === "failed" || status === "cancelled";
}
