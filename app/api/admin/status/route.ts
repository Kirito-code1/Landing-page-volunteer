import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { createRouteSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createRouteSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return NextResponse.json({
      isAdmin: isAdminEmail(user?.email),
    });
  } catch {
    return NextResponse.json({
      isAdmin: false,
    });
  }
}
