const ADMIN_EMAIL_KEYS = [
  "ADMIN_EMAIL",
  "PAYMENT_REVIEWER_EMAIL",
  "NEXT_PUBLIC_PAYMENT_REVIEWER_EMAIL",
] as const;

export function getAdminEmail() {
  for (const key of ADMIN_EMAIL_KEYS) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }

  return "";
}

export function isAdminEmail(email: string | null | undefined) {
  const adminEmail = getAdminEmail();
  if (!adminEmail || !email) {
    return false;
  }

  return email.trim().toLowerCase() === adminEmail.toLowerCase();
}
