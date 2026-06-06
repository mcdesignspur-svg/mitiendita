/**
 * Cliente de la Alibaba.com Open Platform (gateway IOP `/rest`).
 *
 * Degradación elegante: sin ALIBABA_APP_KEY/SECRET, `alibabaEnabled()` es false
 * y todo devuelve null — el operador cae a su método de búsqueda actual.
 *
 * ─── CONFIRMADO ───────────────────────────────────────────────────────────
 * Firma IOP (la misma de AliExpress/Lazada/Alibaba.com `/rest`):
 *   1) junta params de sistema + de negocio (sin `sign`)
 *   2) ordena las claves ASC
 *   3) base = apiPath + concat(key+value) de cada par ordenado
 *   4) sign = HMAC-SHA256(base, appSecret) en hex MAYÚSCULAS
 *   timestamp en milisegundos; sign_method = "sha256".
 *
 * ─── POR CONFIRMAR EN TU CONSOLA ──────────────────────────────────────────
 * El nombre EXACTO del endpoint de búsqueda/detalle de productos ICBU y su
 * esquema de respuesta. Por eso `searchProducts` imprime/retorna el JSON crudo
 * la primera vez: con esa respuesta real afinamos el mapeo a SourcingCandidate.
 * Ajusta ALIBABA_PRODUCT_SEARCH_PATH si tu consola muestra otro path.
 */
import crypto from "node:crypto";

const GATEWAY = process.env.ALIBABA_GATEWAY || "https://openapi-api.alibaba.com/rest";

export function alibabaEnabled(): boolean {
  return Boolean(process.env.ALIBABA_APP_KEY && process.env.ALIBABA_APP_SECRET);
}

export interface AlibabaResponse {
  [key: string]: unknown;
  code?: string;
  message?: string;
  request_id?: string;
}

/**
 * Llama a un endpoint del gateway IOP con la firma correcta.
 * Devuelve el JSON crudo, o null si faltan llaves / falla la llamada.
 */
export async function alibabaCall(
  apiPath: string,
  params: Record<string, string | number> = {},
  opts: { useAccessToken?: boolean } = {},
): Promise<AlibabaResponse | null> {
  const appKey = process.env.ALIBABA_APP_KEY;
  const appSecret = process.env.ALIBABA_APP_SECRET;
  if (!appKey || !appSecret) return null;

  const all: Record<string, string> = {
    app_key: appKey,
    timestamp: String(Date.now()),
    sign_method: "sha256",
  };
  if (opts.useAccessToken !== false && process.env.ALIBABA_ACCESS_TOKEN) {
    all.access_token = process.env.ALIBABA_ACCESS_TOKEN;
  }
  for (const [k, v] of Object.entries(params)) all[k] = String(v);

  // Firma IOP
  const base = apiPath + Object.keys(all).sort().map((k) => k + all[k]).join("");
  const sign = crypto.createHmac("sha256", appSecret).update(base, "utf8").digest("hex").toUpperCase();

  const body = new URLSearchParams({ ...all, sign }).toString();
  try {
    const res = await fetch(`${GATEWAY}${apiPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    return (await res.json()) as AlibabaResponse;
  } catch (e) {
    console.error("[alibaba] llamada fallida:", e);
    return null;
  }
}

/**
 * Paso 2 del OAuth: cambia el `auth_code` (que llega al redirect tras autorizar
 * la app) por un access_token. Guarda el token resultante en ALIBABA_ACCESS_TOKEN.
 * (El nombre del parámetro del código puede ser `code`; confírmalo en la doc del
 * endpoint /auth/token/create de tu consola.)
 */
export async function createAccessToken(authCode: string): Promise<AlibabaResponse | null> {
  return alibabaCall("/auth/token/create", { code: authCode }, { useAccessToken: false });
}

/**
 * Búsqueda de productos ICBU. Devuelve el JSON crudo para que veamos el esquema
 * real y afinemos el mapeo. Ajusta el path en ALIBABA_PRODUCT_SEARCH_PATH si tu
 * consola muestra otro (p. ej. /icbu/product/search u otro nombre del programa).
 */
export async function searchProducts(
  keyword: string,
  opts: { page?: number; pageSize?: number; extra?: Record<string, string | number> } = {},
): Promise<AlibabaResponse | null> {
  const path = process.env.ALIBABA_PRODUCT_SEARCH_PATH || "/icbu/product/search";
  return alibabaCall(path, {
    keyword,
    page: opts.page ?? 1,
    page_size: opts.pageSize ?? 20,
    ...(opts.extra ?? {}),
  });
}

/** Detalle de un producto ICBU por id. Ajusta el path si tu consola difiere. */
export async function getProduct(productId: string): Promise<AlibabaResponse | null> {
  const path = process.env.ALIBABA_PRODUCT_GET_PATH || "/icbu/product/get";
  return alibabaCall(path, { product_id: productId });
}
