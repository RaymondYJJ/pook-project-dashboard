import { NextResponse } from "next/server";
import type { AlertStatus } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const statuses = new Set<AlertStatus>(["open", "acknowledged", "resolved", "ignored"]);

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  const form = await request.formData();
  const alertId = String(form.get("alertId") ?? "");
  const status = String(form.get("status") ?? "") as AlertStatus;
  const note = String(form.get("handlingNote") ?? "").trim();
  const returnTo = String(form.get("returnTo") ?? "/alerts");

  if (!alertId || !statuses.has(status)) {
    return NextResponse.redirect(new URL("/alerts?error=invalid_status", request.url), 303);
  }

  await prisma.$transaction(async (tx) => {
    await tx.alertEvent.update({
      where: { id: alertId },
      data: {
        status,
        handlingNote: note || undefined
      }
    });
    await tx.auditLog.create({
      data: {
        userId: session?.userId,
        action: "alert.status.update",
        resource: "alert_event",
        resourceId: alertId,
        metadata: { status, handlingNote: note }
      }
    });
  });

  return NextResponse.redirect(new URL(returnTo, request.url), 303);
}
