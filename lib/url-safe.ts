// Validación de URLs ingeridas/editadas para prevenir esquemas peligrosos
// (javascript:, data:, vbscript:, etc.) que de otro modo terminan en
// <a href>/<img src> del admin o de la tienda. Usado por el pipeline de
// ingesta (normalizeCandidate), el form de productos y donde se renderice
// una URL controlada por un agente externo o por el cliente.

const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

/** Devuelve la URL normalizada si es http(s) y bien formada; si no, undefined. */
export function safeUrl(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  try {
    const u = new URL(trimmed);
    return SAFE_PROTOCOLS.has(u.protocol) ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

// Sufijos de host permitidos para imágenes remotas: Vercel Blob + CDN de Alibaba.
const IMAGE_HOST_SUFFIXES = [".public.blob.vercel-storage.com", ".alicdn.com"];

/**
 * Devuelve la URL de imagen si es http(s) y de un host permitido; si no,
 * undefined. Mantener en sync con `images.remotePatterns` de next.config.ts.
 */
export function safeImageUrl(input: unknown): string | undefined {
  const url = safeUrl(input);
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const ok = IMAGE_HOST_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s));
    return ok ? url : undefined;
  } catch {
    return undefined;
  }
}

// Los videos del producto se suben a Vercel Blob; solo aceptamos ese host.
const VIDEO_HOST_SUFFIXES = [".public.blob.vercel-storage.com"];

/**
 * Devuelve la URL de video si es http(s) y de un host permitido (Vercel Blob);
 * si no, undefined. Usado por el form de productos y al renderizar el <video>.
 */
export function safeVideoUrl(input: unknown): string | undefined {
  const url = safeUrl(input);
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const ok = VIDEO_HOST_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s));
    return ok ? url : undefined;
  } catch {
    return undefined;
  }
}
