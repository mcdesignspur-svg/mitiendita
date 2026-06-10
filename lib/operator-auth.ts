/**
 * Auth compartida del bus del operador (ingest + brief + queue/done).
 * Todos los endpoints del bus usan el mismo secreto Bearer `OPERATOR_INGEST_TOKEN`.
 * Sin él, el bus está deshabilitado (no abrimos endpoints de la operación sin secreto).
 */
import crypto from "node:crypto";

/** True si el bus del operador está habilitado (hay token configurado). */
export function operatorBusEnabled(): boolean {
  return Boolean(process.env.OPERATOR_INGEST_TOKEN);
}

/**
 * G-2: Compara el Bearer del request con el token usando timingSafeEqual
 * sobre hashes SHA-256 de longitud fija, eliminando la filtración de longitud
 * que producía la comparación carácter a carácter anterior.
 */
export function operatorAuthorized(req: Request): boolean {
  const expected = process.env.OPERATOR_INGEST_TOKEN;
  if (!expected) return false;
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = bearer || req.headers.get("x-operator-token") || "";

  // Hash ambos lados a SHA-256 (32 bytes fijos) → timingSafeEqual no filtra longitud.
  const hashExpected = crypto.createHash("sha256").update(expected).digest();
  const hashToken = crypto.createHash("sha256").update(token).digest();
  return crypto.timingSafeEqual(hashExpected, hashToken);
}
