/**
 * Auth compartida del bus del operador (ingest + brief + queue/done).
 * Todos los endpoints del bus usan el mismo secreto Bearer `OPERATOR_INGEST_TOKEN`.
 * Sin él, el bus está deshabilitado (no abrimos endpoints de la operación sin secreto).
 */

/** True si el bus del operador está habilitado (hay token configurado). */
export function operatorBusEnabled(): boolean {
  return Boolean(process.env.OPERATOR_INGEST_TOKEN);
}

/** Compara el Bearer del request con el token, en tiempo constante. */
export function operatorAuthorized(req: Request): boolean {
  const expected = process.env.OPERATOR_INGEST_TOKEN;
  if (!expected) return false;
  const header = req.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  const token = bearer || req.headers.get("x-operator-token") || "";
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
