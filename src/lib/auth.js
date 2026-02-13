import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "fintrack_session";

// --- password verify (scrypt) ---
export function verifyPassword(password, salt, expectedHash) {
  const hashBuf = Buffer.from(expectedHash, "hex");
  const derived = crypto.scryptSync(password, salt, hashBuf.length);
  return crypto.timingSafeEqual(hashBuf, derived);
}

// --- session helpers ---
export function newSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function setSessionCookie(token, expiresAt) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return session.user;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) throw { status: 401 };
  return user;
}
