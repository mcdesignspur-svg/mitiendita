import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { alibabaEnabled, createAccessToken, type AlibabaResponse } from "@/lib/alibaba";

export const runtime = "nodejs";

/**
 * Callback de OAuth de la Alibaba.com Open Platform.
 *
 * Registra esta URL como "Callback/Redirect URL" de tu app:
 *   https://mitiendita-six.vercel.app/api/alibaba/callback
 *
 * Tras autorizar la app, Alibaba redirige aquí con `?code=...` (auth_code).
 * Esta ruta lo cambia por un access_token (vía /auth/token/create) y te muestra
 * el token para que lo pegues en ALIBABA_ACCESS_TOKEN (env de Vercel) y redeploys.
 *
 * Protegida por sesión de admin: inicia sesión en /admin en el mismo navegador.
 */
export async function GET(req: Request) {
  if (!(await isAdmin())) {
    return page("No autorizado", "Inicia sesión en <a href='/admin'>/admin</a> en este mismo navegador y vuelve a abrir el enlace de autorización.");
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error") || url.searchParams.get("error_description");
  if (error) return page("Alibaba devolvió un error", escapeHtml(error));
  if (!code) {
    return page(
      "Falta el código",
      "No llegó <code>?code</code> (auth_code) en la URL. Inicia el flujo desde el botón de autorización de tu app en la consola de Alibaba.",
    );
  }
  if (!alibabaEnabled()) {
    return page(
      "Faltan las llaves",
      "Configura <code>ALIBABA_APP_KEY</code> y <code>ALIBABA_APP_SECRET</code> en el entorno (Vercel) y redeploys antes de intercambiar el código.",
    );
  }

  const res = await createAccessToken(code);
  if (!res) {
    return page("Sin respuesta", "La llamada a <code>/auth/token/create</code> falló (revisa llaves, firma y permisos de la app).");
  }

  const token = pickToken(res);
  const body = `
    ${token ? `<p><strong>access_token:</strong></p><pre class="tok">${escapeHtml(token)}</pre>
      <p>Pégalo en <code>ALIBABA_ACCESS_TOKEN</code> (Vercel → Settings → Environment Variables, Production) y redeploys.</p>`
      : `<p style="color:#b00">No encontré un campo de token en la respuesta. Mira el JSON crudo abajo y dime el nombre del campo; ajusto el cliente.</p>`}
    <details open><summary>Respuesta cruda</summary><pre>${escapeHtml(JSON.stringify(res, null, 2))}</pre></details>
  `;
  return page("Token de Alibaba", body);
}

function pickToken(res: AlibabaResponse): string | null {
  const candidates = ["access_token", "accessToken", "token"];
  for (const k of candidates) {
    const v = (res as Record<string, unknown>)[k];
    if (typeof v === "string" && v) return v;
  }
  return null;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function page(title: string, bodyHtml: string): NextResponse {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtml(title)} — Mi Tiendita PR</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1c1813;line-height:1.5}
    h1{font-size:24px}
    pre{background:#f4f1ec;border:1px solid #e2dccf;border-radius:10px;padding:12px;overflow:auto;font-size:13px;white-space:pre-wrap;word-break:break-all}
    pre.tok{background:#e6f7f4;border-color:#0a7d72}
    code{background:#f4f1ec;padding:1px 5px;border-radius:5px}
    a{color:#ff5a36}
  </style></head>
  <body><h1>${escapeHtml(title)}</h1>${bodyHtml}</body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
