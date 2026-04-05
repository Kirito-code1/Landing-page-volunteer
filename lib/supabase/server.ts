import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

import { requirePublicSupabaseConfig } from "@/lib/supabase/config";

export async function createRouteSupabaseClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = requirePublicSupabaseConfig();

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    },
  );
}
