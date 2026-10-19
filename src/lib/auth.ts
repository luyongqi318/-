import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getSetting, setSetting } from "./settings";

const SECRET = process.env.AUTH_SECRET || "doubletree-hr-local-dev-secret";
const COOKIE_NAME = "hr_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

const HR_USER = process.env.HR_USER || "hr";
const HR_PASS = process.env.HR_PASS || "doubletree2026";

const PASSWORD_SETTING = "admin_password_hash";

function sign(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const calculated = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return calculated.length === expected.length && crypto.timingSafeEqual(calculated, expected);
}

/** 网页里改过密码后，以数据库里的 hash 为准；否则回退到环境变量。 */
export function hasCustomPassword(): boolean {
  return Boolean(getSetting(PASSWORD_SETTING));
}

export function setAdminPassword(password: string): void {
  setSetting(PASSWORD_SETTING, hashPassword(password));
}

export function resetAdminPassword(): void {
  setSetting(PASSWORD_SETTING, "");
}

export function checkCredentials(user: string, password: string): boolean {
  const stored = getSetting(PASSWORD_SETTING);
  const passwordOk = stored ? verifyPassword(password, stored) : safeEqual(password, HR_PASS);
  return safeEqual(user, HR_USER) && passwordOk;
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
