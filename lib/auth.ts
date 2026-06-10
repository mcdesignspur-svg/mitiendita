import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { Business } from "./types";
import { getBusinessById } from "./db";

// A-1(a): En producción, SESSION_SECRET debe estar seteado explícitamente.
// Fallar al cargar es preferible a silenciosamente usar un secreto conocido.
const _rawSecret = process.env.SESSION_SECRET;
if (!_rawSecret && process.env.NODE_ENV === "production") {
  throw new Error(
    "[auth] SESSION_SECRET no está seteado. Configúralo en las variables de entorno antes de deployar.",
  );
}
const SECRET = _rawSecret || "mi-tiendita-dev-secret-change-me";

const SESSION_COOKIE = "mt_session";
const ADMIN_COOKIE = "mt_admin";

// TTLs de tokens (en segundos).
const TTL_SESSION_S = 60 * 60 * 24 * 30; // 30 días
const TTL_ADMIN_S = 60 * 60 * 24 * 7;    // 7 días

// Password hashing vive en ./crypto (módulo puro). Se re-exporta por compatibilidad.
export { hashPassword, verifyPassword } from "./crypto";

// --- Signing -------------------------------------------------------
// Formato del valor firmado: "<payload>:<issuedAt_epoch_s>".
// El HMAC cubre todo el string "payload:issuedAt" antes del punto separador.

function sign(value: string): Buffer {
  return crypto.createHmac("sha256", SECRET).update(value).digest();
}

function makeToken(payload: string): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const value = `${payload}:${issuedAt}`;
  const mac = sign(value).toString("hex");
  return `${value}.${mac}`;
}

/**
 * Verifica firma y TTL. Devuelve el payload original o null si algo falla.
 * `maxAgeS` es el TTL máximo en segundos desde emisión.
 */
function readToken(token: string | undefined, maxAgeS: number): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return null;
  const value = token.slice(0, idx);   // "payload:issuedAt"
  const sigHex = token.slice(idx + 1);

  // Comparación en tiempo constante: hashea ambos a Buffer de igual longitud.
  const expected = sign(value);
  let candidate: Buffer;
  try {
    candidate = Buffer.from(sigHex, "hex");
  } catch {
    return null;
  }
  if (candidate.length !== expected.length) {
    // Longitudes distintas: rellena con ceros para no revelar nada antes de comparar.
    const padded = Buffer.alloc(expected.length, 0);
    candidate.copy(padded, 0, 0, Math.min(candidate.length, padded.length));
    // Asegurar que siempre falla (longitudes distintas ⇒ inválido).
    if (!crypto.timingSafeEqual(padded, expected)) return null;
    return null;
  }
  if (!crypto.timingSafeEqual(candidate, expected)) return null;

  // Verifica TTL.
  const parts = value.split(":");
  const issuedAt = parseInt(parts[parts.length - 1], 10);
  if (!issuedAt || isNaN(issuedAt)) return null;
  const age = Math.floor(Date.now() / 1000) - issuedAt;
  if (age < 0 || age > maxAgeS) return null;

  // Reconstruye el payload (puede contener ":" si era un UUID).
  return parts.slice(0, -1).join(":");
}

// --- Business session -------------------------------------------
export async function setSession(businessId: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, makeToken(businessId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_SESSION_S,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionBusiness(): Promise<Business | null> {
  const jar = await cookies();
  const businessId = readToken(jar.get(SESSION_COOKIE)?.value, TTL_SESSION_S);
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
    maxAge: TTL_ADMIN_S,
  });
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const jar = await cookies();
  return readToken(jar.get(ADMIN_COOKIE)?.value, TTL_ADMIN_S) === "admin";
}

// A-1(b): En producción, ADMIN_PASSWORD debe estar seteado.
// Usa timingSafeEqual sobre hashes SHA-256 de longitud fija para no filtrar longitud.
export function checkAdminPassword(password: string): boolean {
  const stored = process.env.ADMIN_PASSWORD;
  if (!stored) {
    // En prod: sin contraseña configurada → denegar siempre (fail-closed).
    // En dev: permite el fallback "admin".
    if (process.env.NODE_ENV === "production") return false;
    // Dev fallback
    const devPassword = "admin";
    const a = crypto.createHash("sha256").update(password).digest();
    const b = crypto.createHash("sha256").update(devPassword).digest();
    return crypto.timingSafeEqual(a, b);
  }
  // Compara hashes para no revelar longitud de la contraseña almacenada.
  const a = crypto.createHash("sha256").update(password).digest();
  const b = crypto.createHash("sha256").update(stored).digest();
  return crypto.timingSafeEqual(a, b);
}
