import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    { error: "Ручное отключение Premium больше недоступно." },
    { status: 410 },
  );
}
