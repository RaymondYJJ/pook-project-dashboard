import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { confirmUploadBatch } from "@/lib/data/importer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  const form = await request.formData();
  const batchId = String(form.get("batchId") ?? "");
  if (!batchId) return NextResponse.redirect(new URL("/uploads?error=missing_batch", request.url), 303);

  try {
    await confirmUploadBatch(batchId, session?.userId);
    return NextResponse.redirect(new URL(`/uploads?batchId=${batchId}&confirmed=1`, request.url), 303);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : String(error));
    return NextResponse.redirect(new URL(`/uploads?batchId=${batchId}&error=${message}`, request.url), 303);
  }
}
