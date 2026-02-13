import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearSessionCookie } from "@/lib/auth";
import { cookies } from "next/headers";

const SESSION_COOKIE = "fintrack_session";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;

    // Delete session from DB (if it exists)
    if (token) {
      await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    }

    // Clear cookie regardless
    await clearSessionCookie();

    return NextResponse.json({ message: "Logged out" });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
    // Still clear cookie on error
    await clearSessionCookie().catch(() => {});
    return NextResponse.json({ message: "Logged out" });
  }
}
