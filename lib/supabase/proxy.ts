import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicSupabaseConfig } from "@/lib/supabase/config";

const PROTECTED_ROUTES = ["/dashboard", "/profile"];
const PUBLIC_AUTH_ROUTES = ["/auth/login", "/auth/registr"];

function matchesRoute(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function createProxyResponse(request: NextRequest) {
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  });
}

export async function handleAuthProxy(request: NextRequest) {
  let response = createProxyResponse(request);
  const supabaseConfig = getPublicSupabaseConfig();
  const { pathname } = request.nextUrl;

  if (!supabaseConfig) {
    return response;
  }

  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set({ name, value, ...options });
          });

          response = createProxyResponse(request);

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    },
  );

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      throw error;
    }

    if (!user && matchesRoute(pathname, PROTECTED_ROUTES)) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    if (user && matchesRoute(pathname, PUBLIC_AUTH_ROUTES)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    if (user && pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch (error) {
    console.error("Supabase auth proxy failed", {
      pathname,
      error: error instanceof Error ? error.message : String(error),
    });

    if (matchesRoute(pathname, PROTECTED_ROUTES)) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Vary", "Cookie");

  return response;
}
