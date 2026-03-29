export function sanitizeNextPath(
  value: string | null | undefined,
  fallback = "/dashboard",
) {
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // Prevent protocol-relative redirects like //evil.com
  if (trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}

export function buildAuthCallbackUrl(origin: string, nextPath: string) {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", sanitizeNextPath(nextPath));
  return url.toString();
}
