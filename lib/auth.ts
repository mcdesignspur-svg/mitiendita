import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { Business } from "./types";
import { getBusinessById } from "./db";

const SECRET = process.env.SESSION_SECRET || "mi-tiendita-dev-secret-change-me";
const SESSION_COOKIE = "mt_session";
const ADMIN_COOKIE = "mt_admin";

// Password hashing vive en ./crypto (módulo puro). Se re-exporta por compatibilidad.
export { hashPassword, verifyPassword } from "./crypto";

// --- Signing ----------------------------------------------------
function sign(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(value).digest("hex").slice(0, 32);
}

function makeToken(value: string): string {
  return `${value}.${sign(value)}`;
}

function readToken(token: string | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const value = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  return sign(value) === sig ? value : null;
}

// --- Business session -------------------------------------------
export async function setSession(businessId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, makeToken(businessId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionBusiness(): Promise<Business | null> {
  const jar = await cookies();
  const businessId = readToken(jar.get(SESSION_COOKIE)?.value);
  if (!businessId) return null;
  return (await getBusinessById(businessId)) ?? null;
}

// --- Admin session ----------------------------------------------
export async function setAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, makeToken("admin"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // 30 días: que la consola del operador sobreviva entre corridas del agente.
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return readToken(jar.get(ADMIN_COOKIE)?.value) === "admin";
}

export function checkAdminPassword(password: string): boolean {
  return password === (process.env.ADMIN_PASSWORD || "admin");
}
