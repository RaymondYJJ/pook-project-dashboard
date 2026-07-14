import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { confirmUploadBatch } from "@/lib/data/importer";
import { appendUploadResultParams, buildBatchConfirmRedirectParams, parseUploadBatchIds } from "@/lib/uploads/preview";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  const form = await request.formData();
  const batchId = String(form.get("batchId") ?? "");
  const returnTo = String(form.get("returnTo") ?? "/uploads");
  const batchIds = parseUploadBatchIds(String(form.get("batchIds") ?? batchId));
  if (!batchIds.length) return NextResponse.redirect(new URL("/uploads?error=missing_batch", request.url), 303);

  const imported: string[] = [];
  const failed: { id: string; message: string }[] = [];
  for (const id of batchIds) {
    try {
      await confirmUploadBatch(id, session?.userId);
      imported.push(id);
    } catch (error) {
      failed.push({ id, message: error instanceof Error ? error.message : String(error) });
    }
  }
  const params = buildBatchConfirmRedirectParams({ imported, failed });
  if (!imported.length && !failed.length) params.set("error", "no_batches_confirmed");
  return NextResponse.redirect(new URL(appendUploadResultParams(returnTo, params), request.url), 303);
}
