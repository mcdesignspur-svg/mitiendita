import { NextResponse, type NextRequest } from "next/server";
import { UNLOCK_COOKIE, verifyUnlockToken } from "@/lib/site-lock";

/**
 * Candado del sitio público (Routing Middleware — convención `proxy` de Next 16+).
 * El sitio principal está cerrado: solo se entra con la contraseña (misma que
 * ADMIN_PASSWORD, ver `unlockSiteAction`). Quedan SIEMPRE públicas —sin
 * contraseña— estas rutas:
 *
 *   /exclusivo/*  → los links cerrados de producto (thumbcamera y futuros) + su
 *                   checkout (server action) y /exclusivo/gracias.
 *   /entrar       → la propia página de contraseña.
 *   /admin        → bypass: mantiene su propio login de admin.
 *   /api          → webhooks server-to-server (Stripe/ATH — no pueden autenticar
 *                   con contraseña) y rutas internas que ya se protegen solas.
 *
 * Los assets de Next (_next/static, _next/image) y los archivos con extensión
 * (logo.svg, favicon, fuentes, robots/sitemap) se excluyen en `config.matcher`.
 */
const PUBLIC_PREFIXES = ["/exclusivo", "/entrar", "/admin", "/api"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Interruptor: el sitio está CERRADO por defecto. Para reabrirlo al público
  // sin deploy, define `SITE_LOCK=off` en las variables de entorno de Vercel.
  if (process.env.SITE_LOCK === "off") return NextResponse.next();

  if (isPublic(pathname)) return NextResponse.next();

  const token = req.cookies.get(UNLOCK_COOKIE)?.value;
  if (await verifyUnlockToken(token)) return NextResponse.next();

  // Bloqueado → a la página de contraseña, recordando a dónde iba.
  const url = req.nextUrl.clone();
  url.pathname = "/entrar";
  url.search =
    pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
  return NextResponse.redirect(url);
}

export const config = {
  // Corre en todo salvo los assets de Next y cualquier archivo con extensión.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
