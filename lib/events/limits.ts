type MetadataHolder = {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined;

export const FREE_POST_LIMIT = 5;
export const FREE_POST_USAGE_KEY = "free_post_credits_used";

function normalizeUsageValue(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

export function getFreePostCreditsUsed(user: MetadataHolder) {
  return Math.max(
    normalizeUsageValue(user?.user_metadata?.[FREE_POST_USAGE_KEY]),
    normalizeUsageValue(user?.app_metadata?.[FREE_POST_USAGE_KEY]),
  );
}

export function getFreePostsLeft(user: MetadataHolder) {
  return Math.max(0, FREE_POST_LIMIT - getFreePostCreditsUsed(user));
}
