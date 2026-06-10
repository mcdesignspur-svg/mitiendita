import { NextResponse } from "next/server";
import { runDailyMaintenance } from "@/lib/cron";

export const runtime = "nodejs";
// El cron de Vercel no debe cachearse.
export const dynamic = "force-dynamic";

/**
 * Cron diario del operador (lo programa vercel.json). Detecta stock bajo →
 * gates de recompra, finaliza promociones vencidas, y resume follow-ups y pagos
 * pendientes en la bitácora. Ver OPERATIONS.md §5.
 *
 * Auth: Vercel agrega `Authorization: Bearer <CRON_SECRET>` si CRON_SECRET está
 * configurado. CR-5/A-1: En producción sin CRON_SECRET el endpoint se deniega
 * (fail-closed). En dev sin CRON_SECRET se permite para pruebas locales.
 */
function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;

  // CR-5: En producción, si no hay CRON_SECRET configurado → denegar siempre.
  // Antes: `if (!secret) return true` dejaba el cron público en prod.
  if (!secret) {
    if (process.env.NODE_ENV === "production") return false;
    // Dev sin CRON_SECRET: permitir para poder probar localmente.
    return true;
  }

  return (req.headers.get("authorization") || "") === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const summary = await runDailyMaintenance();
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    console.error("[cron/daily] fallo:", e);
    return NextResponse.json({ error: "Fallo el mantenimiento diario." }, { status: 500 });
  }
}
