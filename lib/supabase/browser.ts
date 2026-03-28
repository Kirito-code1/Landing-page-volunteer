import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | null | undefined;

function getPublicSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  try {
    new URL(url);
  } catch {
    return null;
  }

  return { url, anonKey };
}

export function hasBrowserSupabaseEnv() {
  return Boolean(getPublicSupabaseConfig());
}

export function getBrowserSupabaseClient() {
  const config = getPublicSupabaseConfig();
  if (!config) {
    return null;
  }

  if (!browserClient) {
    try {
      browserClient = createBrowserClient(config.url, config.anonKey);
    } catch {
      return null;
    }
  }

  return browserClient;
}
