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
 * configurado. Sin CRON_SECRET (dev) se permite para poder probarlo a mano.
 */
function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
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
