import type { SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js";

import { getPremiumExpiresAt, hasPremiumAccess } from "@/lib/auth/premium";

type PremiumStatusResponse = {
  changed?: boolean;
  isPremium?: boolean;
  expiresAt?: string | null;
};

let premiumSessionSyncPromise: Promise<SupabaseUser | null> | null = null;

function shouldRefreshPremiumSession(
  sessionUser: SupabaseUser,
  payload: PremiumStatusResponse | null,
) {
  if (!payload) {
    return false;
  }

  return (
    payload.changed === true ||
    hasPremiumAccess(sessionUser) !== (payload.isPremium === true) ||
    (getPremiumExpiresAt(sessionUser) ?? null) !== (payload.expiresAt ?? null)
  );
}

export async function syncPremiumSessionUser(
  supabase: SupabaseClient | null,
  sessionUser: SupabaseUser | null,
) {
  if (!supabase || !sessionUser) {
    return sessionUser;
  }

  if (!premiumSessionSyncPromise) {
    premiumSessionSyncPromise = (async () => {
      try {
        const response = await fetch("/api/premium/status", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as PremiumStatusResponse | null;

        if (!response.ok || !shouldRefreshPremiumSession(sessionUser, payload)) {
          return sessionUser;
        }

        await supabase.auth.refreshSession();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        return session?.user ?? sessionUser;
      } catch {
        return sessionUser;
      }
    })().finally(() => {
      premiumSessionSyncPromise = null;
    });
  }

  return premiumSessionSyncPromise;
}
