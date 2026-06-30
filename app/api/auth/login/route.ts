import { NextResponse } from "next/server";
import { setSession, signSession, validatePassword } from "@/lib/auth/session";

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    const user = await validatePassword(email, password);
    if (!user) return NextResponse.redirect(new URL("/login?error=credentials", request.url));
    const token = await signSession(user);
    await setSession(token);
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.redirect(new URL("/login?error=db", request.url));
  }
}
