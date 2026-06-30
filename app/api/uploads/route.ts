import { NextResponse } from "next/server";
import type { ProjectCode, ReportType } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { createUploadPreview } from "@/lib/data/importer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  const form = await request.formData();
  const projectCode = String(form.get("projectCode") ?? "") as ProjectCode;
  const reportType = String(form.get("reportType") ?? "") as ReportType;
  const reportDate = parseReportDate(String(form.get("reportDate") ?? form.get("reportMonth") ?? ""));
  const file = form.get("file");

  if (!(file instanceof File) || file.size <= 0 || !projectCode || !reportType || !reportDate) {
    return NextResponse.redirect(new URL("/uploads?error=missing_fields", request.url), 303);
  }

  try {
    const result = await createUploadPreview({ file, projectCode, reportType, reportDate, userId: session?.userId });
    return NextResponse.redirect(new URL(`/uploads?batchId=${result.batchId}`, request.url), 303);
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : String(error));
    return NextResponse.redirect(new URL(`/uploads?error=${message}`, request.url), 303);
  }
}

function parseReportDate(value: string) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}$/.test(value) ? `${value}-01` : value;
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
