import { createClient } from "@supabase/supabase-js";

import { requireSupabaseUrl } from "@/lib/supabase/config";

let adminClient: ReturnType<typeof createClient> | null = null;

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getSupabaseAdmin() {
  if (adminClient) {
    return adminClient;
  }

  adminClient = createClient(
    requireSupabaseUrl(),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return adminClient;
}
