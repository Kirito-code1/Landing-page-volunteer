import { createBrowserClient } from "@supabase/ssr";

import { getPublicSupabaseConfig } from "@/lib/supabase/config";

let browserClient: ReturnType<typeof createBrowserClient> | null | undefined;

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
      browserClient = createBrowserClient(config.url, config.publishableKey);
    } catch {
      return null;
    }
  }

  return browserClient;
}
