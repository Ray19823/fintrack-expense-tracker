import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, newSessionToken, setSessionCookie } from "@/lib/auth";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const ok = await verifyPassword(
      password,
      user.passwordSalt,
      user.passwordHash,
    );
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Create session
    const token = newSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.session.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Set cookie

    const res = NextResponse.json({
      message: "Logged in",
      user: { id: user.id, email: user.email },
      expiresAt,
    });

    // Set session cookie on response
    setSessionCookie(res, token, expiresAt);

    return res;
  } catch (e) {
    console.error("LOGIN ERROR:", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
