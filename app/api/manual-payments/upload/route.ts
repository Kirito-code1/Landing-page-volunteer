import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const BUCKET_NAME = "manual-payment-files";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/octet-stream",
]);

function normalizeExtension(fileName: string, mimeType: string) {
  const provided = fileName.split(".").pop()?.toLowerCase();
  if (provided && /^[a-z0-9]{1,8}$/.test(provided)) {
    return provided;
  }

  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "application/pdf") return "pdf";
  return "bin";
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: "Некорректная форма загрузки." }, { status: 400 });
  }

  const kind = formData.get("kind");
  const file = formData.get("file");

  if (kind !== "donation" && kind !== "premium") {
    return NextResponse.json({ error: "Неподдерживаемый тип вложения." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не найден." }, { status: 400 });
  }

  if (file.size <= 0) {
    return NextResponse.json({ error: "Файл пустой." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Файл должен быть не больше 8 МБ." }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES.has(mimeType)) {
    return NextResponse.json({ error: "Поддерживаются JPG, PNG, WEBP и PDF." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const extension = normalizeExtension(file.name, mimeType);
  const path = `${kind}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET_NAME)
    .upload(path, fileBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from(BUCKET_NAME).getPublicUrl(path);

  return NextResponse.json({
    file: {
      name: file.name,
      path,
      url: publicUrl,
      contentType: mimeType,
      size: file.size,
    },
  });
}
