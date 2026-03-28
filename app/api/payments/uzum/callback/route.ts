import { NextResponse } from "next/server";
import { handleUzumCallback } from "@/lib/payments/orders";

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid callback payload." }, { status: 400 });
  }

  await handleUzumCallback(payload);

  return NextResponse.json({ ok: true });
}
