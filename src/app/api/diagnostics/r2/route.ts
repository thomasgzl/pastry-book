import { NextResponse } from "next/server";
import { hasR2Config, R2_BUCKET } from "@/lib/r2";

/**
 * Diagnostic TEMPORAIRE (débogage production R2, à retirer une fois le
 * problème résolu) — ne retourne jamais une valeur de clé, seulement sa
 * présence (booléen). Sans effet sur le comportement fonctionnel.
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    hasR2Config: hasR2Config(),
    hasAccountId: Boolean(process.env.R2_ACCOUNT_ID),
    hasAccessKeyId: Boolean(process.env.R2_ACCESS_KEY_ID),
    hasSecretAccessKey: Boolean(process.env.R2_SECRET_ACCESS_KEY),
    hasBucketName: Boolean(process.env.R2_BUCKET_NAME),
    bucketName: R2_BUCKET || null,
  });
}
