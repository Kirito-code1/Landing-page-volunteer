export type PremiumAwareUser = {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined;

export type PremiumAccessType = "paid" | "trial";

export const PREMIUM_EXPIRES_AT_KEY = "premium_expires_at";
export const PREMIUM_STARTED_AT_KEY = "premium_started_at";
export const PREMIUM_ACCESS_TYPE_KEY = "premium_access_type";
export const PREMIUM_TRIAL_USED_KEY = "premium_trial_used";
export const PREMIUM_TRIAL_DAYS = 7;
export const PREMIUM_PAID_MONTHS = 1;

function hasPremiumFlag(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) return false;

  return (
    metadata.is_premium === true ||
    metadata.subscription_plan === "premium"
  );
}

function parsePremiumExpiry(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function parsePremiumStart(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function getMetadataExpiry(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return { raw: null, time: null } as const;
  }

  const raw = typeof metadata[PREMIUM_EXPIRES_AT_KEY] === "string"
    ? (metadata[PREMIUM_EXPIRES_AT_KEY] as string)
    : null;

  return {
    raw,
    time: parsePremiumExpiry(raw),
  } as const;
}

function getMetadataStart(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return { raw: null, time: null } as const;
  }

  const raw = typeof metadata[PREMIUM_STARTED_AT_KEY] === "string"
    ? (metadata[PREMIUM_STARTED_AT_KEY] as string)
    : null;

  return {
    raw,
    time: parsePremiumStart(raw),
  } as const;
}

function getMetadataAccessType(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return null;
  }

  return metadata[PREMIUM_ACCESS_TYPE_KEY] === "trial" || metadata[PREMIUM_ACCESS_TYPE_KEY] === "paid"
    ? (metadata[PREMIUM_ACCESS_TYPE_KEY] as PremiumAccessType)
    : null;
}

function getMetadataTrialUsed(metadata: Record<string, unknown> | null | undefined) {
  if (!metadata) {
    return false;
  }

  return metadata[PREMIUM_TRIAL_USED_KEY] === true;
}

export function getPremiumExpiryTime(user: PremiumAwareUser) {
  const appExpiry = getMetadataExpiry(user?.app_metadata);
  const userExpiry = getMetadataExpiry(user?.user_metadata);

  if (appExpiry.time === null) return userExpiry.time;
  if (userExpiry.time === null) return appExpiry.time;
  return Math.max(appExpiry.time, userExpiry.time);
}

export function getPremiumExpiresAt(user: PremiumAwareUser) {
  const appExpiry = getMetadataExpiry(user?.app_metadata);
  const userExpiry = getMetadataExpiry(user?.user_metadata);

  if (appExpiry.time === null) return userExpiry.raw;
  if (userExpiry.time === null) return appExpiry.raw;
  return appExpiry.time >= userExpiry.time ? appExpiry.raw : userExpiry.raw;
}

export function getPremiumStartTime(user: PremiumAwareUser) {
  const appStart = getMetadataStart(user?.app_metadata);
  const userStart = getMetadataStart(user?.user_metadata);

  if (appStart.time === null) return userStart.time;
  if (userStart.time === null) return appStart.time;
  return Math.max(appStart.time, userStart.time);
}

export function getPremiumStartedAt(user: PremiumAwareUser) {
  const appStart = getMetadataStart(user?.app_metadata);
  const userStart = getMetadataStart(user?.user_metadata);

  if (appStart.time === null) return userStart.raw;
  if (userStart.time === null) return appStart.raw;
  return appStart.time >= userStart.time ? appStart.raw : userStart.raw;
}

export function getPremiumAccessType(user: PremiumAwareUser): PremiumAccessType | null {
  const appType = getMetadataAccessType(user?.app_metadata);
  const userType = getMetadataAccessType(user?.user_metadata);

  return appType ?? userType ?? null;
}

export function hasUsedPremiumTrial(user: PremiumAwareUser) {
  return (
    getMetadataTrialUsed(user?.app_metadata) ||
    getMetadataTrialUsed(user?.user_metadata) ||
    getPremiumAccessType(user) === "trial"
  );
}

export function hasPremiumAccess(user: PremiumAwareUser, now = Date.now()) {
  const premiumExpiry = getPremiumExpiryTime(user);
  if (premiumExpiry !== null) {
    return premiumExpiry > now;
  }

  return hasPremiumFlag(user?.app_metadata) || hasPremiumFlag(user?.user_metadata);
}

export function needsPremiumStateSync(user: PremiumAwareUser, now = Date.now()) {
  const hasPremium = hasPremiumFlag(user?.app_metadata) || hasPremiumFlag(user?.user_metadata);
  if (!hasPremium) {
    return false;
  }

  const premiumExpiry = getPremiumExpiryTime(user);
  if (premiumExpiry === null || premiumExpiry <= now) {
    return true;
  }

  const premiumStart = getPremiumStartTime(user);
  if (premiumStart === null) {
    return true;
  }

  const premiumType = getPremiumAccessType(user);
  const maxExpectedExpiry = getPremiumWindowEnd(new Date(premiumStart), premiumType).getTime();
  return premiumExpiry > maxExpectedExpiry;
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addMonthsClamped(date: Date, months: number) {
  const sourceYear = date.getUTCFullYear();
  const sourceMonth = date.getUTCMonth();
  const sourceDay = date.getUTCDate();
  const targetMonthIndex = sourceMonth + months;
  const targetYear = sourceYear + Math.floor(targetMonthIndex / 12);
  const normalizedTargetMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, normalizedTargetMonth + 1, 0),
  ).getUTCDate();

  return new Date(
    Date.UTC(
      targetYear,
      normalizedTargetMonth,
      Math.min(sourceDay, lastDayOfTargetMonth),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

export function getPremiumWindowEnd(date: Date, accessType: PremiumAccessType | null) {
  if (accessType === "trial") {
    return addDays(date, PREMIUM_TRIAL_DAYS);
  }

  return addMonthsClamped(date, PREMIUM_PAID_MONTHS);
}
