// Limitador de tasa en memoria (ventana fija) como primera barrera anti-abuso
// para endpoints públicos (asistente, login admin). NOTA: en serverless el
// estado es por-instancia, no global — para un límite duro usar un store
// compartido (Vercel KV / Upstash). Suficiente para frenar bucles triviales.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): { ok: boolean; remaining: number; retryAfterMs: number } {
  // Limpieza perezosa para no crecer sin límite.
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
  }
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, retryAfterMs: 0 };
}
