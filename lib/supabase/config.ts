function readTrimmedValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getSupabaseUrl() {
  // Use direct env access so Next.js can inline public variables into the client bundle.
  const url = readTrimmedValue(process.env.NEXT_PUBLIC_SUPABASE_URL);

  if (!url) {
    return null;
  }

  try {
    new URL(url);
  } catch {
    return null;
  }

  return url;
}

export function requireSupabaseUrl() {
  const url = getSupabaseUrl();

  if (!url) {
    throw new Error("Missing or invalid NEXT_PUBLIC_SUPABASE_URL");
  }

  return url;
}

export function getPublicSupabaseKey() {
  const anonKey = readTrimmedValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (anonKey) {
    return anonKey;
  }

  const publishableKey = readTrimmedValue(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  if (publishableKey) {
    return publishableKey;
  }

  return null;
}

export function requirePublicSupabaseKey() {
  const key = getPublicSupabaseKey();

  if (!key) {
    throw new Error(
      "Missing public Supabase key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return key;
}

export function getPublicSupabaseConfig() {
  const url = getSupabaseUrl();
  const publishableKey = getPublicSupabaseKey();

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function requirePublicSupabaseConfig() {
  const config = getPublicSupabaseConfig();

  if (!config) {
    throw new Error(
      "Missing Supabase public configuration. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  return config;
}
