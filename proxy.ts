import type { NextRequest } from "next/server";

import { handleAuthProxy } from "@/lib/supabase/proxy";

export function proxy(request: NextRequest) {
  return handleAuthProxy(request);
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/profile/:path*",
    "/auth/login/:path*",
    "/auth/registr/:path*",
  ],
};
