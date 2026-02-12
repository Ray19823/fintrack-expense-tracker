import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "fintrack_session";

// --- password verify (scrypt) ---
export async function verifyPassword(password, salt, expectedHash) {
  const hashBuf = Buffer.from(expectedHash, "hex");
  const derived = crypto.scryptSync(password, salt, hashBuf.length);
  return crypto.timingSafeEqual(hashBuf, derived);
}

// --- session helpers ---
export function newSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function setSessionCookie(res, token, expiresAt) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie() {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSessionUser() {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;

  // expired?
  if (session.expiresAt <= new Date()) {
    // optional cleanup
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return null;
  }

  return session.user;
}
