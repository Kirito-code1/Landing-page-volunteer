import { FREE_POST_LIMIT, FREE_POST_USAGE_KEY, getFreePostCreditsUsed } from "@/lib/events/limits";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SupabaseAdminUser = {
  id: string;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

function mergeUsageMetadata(
  metadata: Record<string, unknown> | null | undefined,
  freePostsUsed: number,
) {
  return {
    ...(metadata ?? {}),
    [FREE_POST_USAGE_KEY]: freePostsUsed,
  };
}

export async function getFreePostQuotaByUserId(userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.admin.getUserById(userId);

  if (error || !data.user) {
    throw error ?? new Error("User not found.");
  }

  const { count, error: countError } = await admin
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    throw countError;
  }

  const user = data.user as SupabaseAdminUser;
  const freePostsUsed = Math.max(getFreePostCreditsUsed(user), count ?? 0);

  return {
    user,
    freePostsUsed,
    postsLeft: Math.max(0, FREE_POST_LIMIT - freePostsUsed),
    reachedLimit: freePostsUsed >= FREE_POST_LIMIT,
  };
}

export async function setFreePostCreditsUsed(userId: string, freePostsUsed: number) {
  const { user } = await getFreePostQuotaByUserId(userId);
  const admin = getSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: mergeUsageMetadata(user.user_metadata, freePostsUsed),
    app_metadata: mergeUsageMetadata(user.app_metadata, freePostsUsed),
  });

  if (error) {
    throw error;
  }

  return {
    freePostsUsed,
    postsLeft: Math.max(0, FREE_POST_LIMIT - freePostsUsed),
    reachedLimit: freePostsUsed >= FREE_POST_LIMIT,
  };
}
