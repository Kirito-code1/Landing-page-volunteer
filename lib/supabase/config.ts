const PUBLIC_SUPABASE_KEY_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  // Keep legacy behavior so existing deployments don't break if both keys are set.
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
] as const;

function readTrimmedEnv(name: string) {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function getSupabaseUrl() {
  const url = readTrimmedEnv("NEXT_PUBLIC_SUPABASE_URL");

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
  for (const name of PUBLIC_SUPABASE_KEY_ENV_NAMES) {
    const value = readTrimmedEnv(name);

    if (value) {
      return value;
    }
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
