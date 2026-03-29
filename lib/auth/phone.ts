export const REQUIRED_PHONE_MIN_DIGITS = 7;

export type PhoneAwareUser = {
  user_metadata?: Record<string, unknown> | null;
} | null | undefined;

export function normalizePhoneInput(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

export function getPhoneDigits(value: unknown) {
  return normalizePhoneInput(value).replace(/\D/g, "");
}

export function hasValidPhoneInput(value: unknown) {
  const digits = getPhoneDigits(value);
  return digits.length >= REQUIRED_PHONE_MIN_DIGITS && digits.length <= 15;
}

export function hasRequiredPhone(user: PhoneAwareUser) {
  return hasValidPhoneInput(user?.user_metadata?.phone);
}

export function getRequiredPhone(user: PhoneAwareUser) {
  return normalizePhoneInput(user?.user_metadata?.phone);
}
