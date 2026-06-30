import { NextResponse } from "next/server";
import type { ProjectCode } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { createAutoUploadPreview } from "@/lib/data/importer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  const form = await request.formData();
  const projectCode = String(form.get("projectCode") ?? "") as ProjectCode;
  const files = form.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);

  if (!projectCode || !files.length) {
    return NextResponse.redirect(new URL("/uploads?error=missing_fields", request.url), 303);
  }

  const succeeded: string[] = [];
  const failed: string[] = [];
  for (const file of files) {
    try {
      const result = await createAutoUploadPreview({ file, projectCode, userId: session?.userId });
      succeeded.push(result.batchId);
    } catch (error) {
      failed.push(`${file.name}:${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const params = new URLSearchParams();
  if (succeeded.length) params.set("batchId", succeeded[0]);
  params.set("uploaded", String(succeeded.length));
  if (failed.length) params.set("failed", String(failed.length));
  return NextResponse.redirect(new URL(`/uploads?${params.toString()}`, request.url), 303);
}
