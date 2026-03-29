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

export function buildCompleteProfilePath(nextPath: string, fallback = "/dashboard") {
  const sanitizedNextPath = sanitizeNextPath(nextPath, fallback);
  const safeNextPath = sanitizedNextPath.startsWith("/auth/complete-profile")
    ? fallback
    : sanitizedNextPath;

  const url = new URL("/auth/complete-profile", "http://localhost");
  url.searchParams.set("next", safeNextPath);
  return `${url.pathname}${url.search}`;
}
