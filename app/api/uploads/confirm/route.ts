import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { confirmUploadBatch } from "@/lib/data/importer";
import { parseUploadBatchIds, serializeUploadBatchIds } from "@/lib/uploads/preview";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  const form = await request.formData();
  const batchId = String(form.get("batchId") ?? "");
  const batchIds = parseUploadBatchIds(String(form.get("batchIds") ?? batchId));
  if (!batchIds.length) return NextResponse.redirect(new URL("/uploads?error=missing_batch", request.url), 303);

  try {
    const imported: string[] = [];
    for (const id of batchIds) {
      await confirmUploadBatch(id, session?.userId);
      imported.push(id);
    }
    const params = new URLSearchParams({
      batchId: imported[0],
      confirmed: String(imported.length)
    });
    if (imported.length > 1) params.set("batchIds", serializeUploadBatchIds(imported));
    return NextResponse.redirect(new URL(`/uploads?${params.toString()}`, request.url), 303);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : String(error));
    return NextResponse.redirect(new URL(`/uploads?batchId=${batchIds[0]}&error=${message}`, request.url), 303);
  }
}
