import crypto from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { visualAssetSchema } from "@/lib/domain/schemas";
import { getR2UploadUrl } from "@/lib/r2";

const ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

const requestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(ALLOWED_CONTENT_TYPES),
  folder: visualAssetSchema.shape.subjectType,
});

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const { filename, contentType, folder } = parsed.data;
  const extension = filename.split(".").pop()?.toLowerCase() || "webp";
  const key = `${folder}/${crypto.randomUUID()}.${extension}`;

  try {
    const uploadUrl = await getR2UploadUrl(key, contentType);
    return NextResponse.json({ uploadUrl, key });
  } catch (cause) {
    console.error(cause);
    return NextResponse.json({ error: "Impossible de générer l'URL d'upload." }, { status: 500 });
  }
}
