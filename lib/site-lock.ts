/**
 * Candado del sitio: token firmado (HMAC-SHA256 con SESSION_SECRET) para la
 * cookie `mt_unlock` que desbloquea el sitio principal. Usa Web Crypto
 * (`crypto.subtle`) para correr IGUAL en el middleware (Edge) y en las server
 * actions (Node). Módulo puro: sin `next/headers` ni `db`, para poder importarse
 * desde el middleware sin arrastrar dependencias de servidor.
 *
 * Es un candado aparte del login de negocio (`mt_session`) y del de admin
 * (`mt_admin`): solo cubre el acceso público al sitio. La contraseña que lo abre
 * es la misma `ADMIN_PASSWORD` (ver `unlockSiteAction` en lib/actions.ts).
 */

export const UNLOCK_COOKIE = "mt_unlock";
export const UNLOCK_TTL_S = 60 * 60 * 24 * 30; // 30 días

function secret(): string {
  return process.env.SESSION_SECRET || "mi-tiendita-dev-secret-change-me";
}

async function hmacHex(value: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(value));
  const bytes = new Uint8Array(sig);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex;
}

/** Comparación en tiempo constante sobre strings hex de igual longitud. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Genera el token firmado para la cookie de desbloqueo. Formato: `<issuedAt>.<hmac>`. */
export async function makeUnlockToken(): Promise<string> {
  const value = String(Math.floor(Date.now() / 1000));
  const mac = await hmacHex(value);
  return `${value}.${mac}`;
}

/** Verifica firma + TTL del token. Devuelve true solo si es válido y no expiró. */
export async function verifyUnlockToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return false;
  const value = token.slice(0, idx);
  const mac = token.slice(idx + 1);

  const expected = await hmacHex(value);
  if (!safeEqual(mac, expected)) return false;

  const issuedAt = parseInt(value, 10);
  if (!issuedAt || Number.isNaN(issuedAt)) return false;
  const age = Math.floor(Date.now() / 1000) - issuedAt;
  return age >= 0 && age <= UNLOCK_TTL_S;
}

/** Opciones de cookie para setear el desbloqueo (con `next/headers` cookies()). */
export function unlockCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: UNLOCK_TTL_S,
  };
}
