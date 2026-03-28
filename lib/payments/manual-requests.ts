import { getAdminEmail } from "@/lib/auth/admin";
import { syncPremiumEntitlement } from "@/lib/payments/orders";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type ManualPaymentKind = "donation" | "premium";
export type ManualPaymentStatus = "pending" | "approved" | "rejected";

export type ManualPaymentRequestRecord = {
  id: string;
  kind: ManualPaymentKind;
  status: ManualPaymentStatus;
  amount_uzs: number;
  user_id: string | null;
  payer_name: string | null;
  payer_email: string | null;
  contact_phone: string | null;
  transfer_reference: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_path: string | null;
  note: string | null;
  review_note: string | null;
  reviewed_by_email: string | null;
  reviewed_at: string | null;
  premium_activated_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type CreateManualPaymentRequestInput = {
  kind: ManualPaymentKind;
  amountUzs: number;
  userId?: string | null;
  payerName?: string | null;
  payerEmail?: string | null;
  contactPhone?: string | null;
  transferReference?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentPath?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown>;
};

function nowIso() {
  return new Date().toISOString();
}

export function getManualPaymentReviewerEmail() {
  return getAdminEmail();
}

export async function createManualPaymentRequest(input: CreateManualPaymentRequestInput) {
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("manual_payment_requests")
    .insert({
      kind: input.kind,
      status: "pending",
      amount_uzs: Math.round(input.amountUzs),
      user_id: input.userId ?? null,
      payer_name: input.payerName ?? null,
      payer_email: input.payerEmail ?? null,
      contact_phone: input.contactPhone ?? null,
      transfer_reference: input.transferReference ?? null,
      attachment_url: input.attachmentUrl ?? null,
      attachment_name: input.attachmentName ?? null,
      attachment_path: input.attachmentPath ?? null,
      note: input.note ?? null,
      metadata: input.metadata ?? {},
      updated_at: nowIso(),
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ManualPaymentRequestRecord;
}

export async function getManualPaymentRequestById(id: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("manual_payment_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ManualPaymentRequestRecord | null) ?? null;
}

export async function listPendingManualPaymentRequests() {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("manual_payment_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw error;
  }

  return (data ?? []) as ManualPaymentRequestRecord[];
}

export async function reviewManualPaymentRequest(input: {
  requestId: string;
  action: "approve" | "reject";
  reviewerEmail: string;
  reviewNote?: string | null;
}) {
  const admin = getSupabaseAdmin();
  const existing = await getManualPaymentRequestById(input.requestId);

  if (!existing) {
    throw new Error("Manual payment request not found.");
  }

  if (existing.status !== "pending") {
    return existing;
  }

  const nextStatus: ManualPaymentStatus = input.action === "approve" ? "approved" : "rejected";
  const updates: Record<string, unknown> = {
    status: nextStatus,
    review_note: input.reviewNote ?? null,
    reviewed_by_email: input.reviewerEmail,
    reviewed_at: nowIso(),
    updated_at: nowIso(),
  };

  if (
    input.action === "approve" &&
    existing.kind === "premium" &&
    existing.user_id &&
    !existing.premium_activated_at
  ) {
    await syncPremiumEntitlement(existing.user_id, true, { source: "paid" });
    updates.premium_activated_at = nowIso();
  }

  const { data, error } = await admin
    .from("manual_payment_requests")
    .update(updates)
    .eq("id", input.requestId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as ManualPaymentRequestRecord;
}
