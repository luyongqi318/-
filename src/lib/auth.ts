import crypto from "node:crypto";
import { cookies } from "next/headers";

const SECRET = process.env.AUTH_SECRET || "doubletree-hr-local-dev-secret";
const COOKIE_NAME = "hr_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

const HR_USER = process.env.HR_USER || "hr";
const HR_PASS = process.env.HR_PASS || "doubletree2026";

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

export function checkCredentials(user: string, password: string): boolean {
  return safeEqual(user, HR_USER) && safeEqual(password, HR_PASS);
}

export function createSessionToken(user: string): string {
  const payload = Buffer.from(JSON.stringify({ u: user, t: Date.now() }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string | null): { u: string; t: number } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!safeEqual(signature, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u: string; t: number };
    if (!data?.t || Date.now() - data.t > MAX_AGE_SEC * 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ u: string; t: number } | null> {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

export const sessionCookie = {
  name: COOKIE_NAME,
  maxAge: MAX_AGE_SEC,
};
