import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { RoleCode } from "@/lib/auth/permissions";

const cookieName = "pook_session";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "dev-only-change-me");
}

export async function signSession(payload: { userId: string; email: string; role: RoleCode }) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function getSession() {
  const token = cookies().get(cookieName)?.value;
  if (!token) return null;
  try {
    const verified = await jwtVerify(token, secret());
    return verified.payload as { userId: string; email: string; role: RoleCode };
  } catch {
    return null;
  }
}

export async function setSession(token: string) {
  cookies().set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
}

export function clearSession() {
  cookies().delete(cookieName);
}

export async function validatePassword(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } }
  });
  if (!user || !user.isActive) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  const role = (user.roles[0]?.role.code ?? "readonly") as RoleCode;
  return { userId: user.id, email: user.email, role };
}
