import { NextResponse } from "next/server";
import { buildBrief, logRun } from "@/lib/control";
import { operatorAuthorized, operatorBusEnabled } from "@/lib/operator-auth";
import type { AgentName } from "@/lib/types";

export const runtime = "nodejs";

/**
 * El "pase por el brain" — paso 0 de cada corrida de un agente stateless (la
 * extensión de Chrome). Devuelve identidad+reglas, estado conocido (no duplicar),
 * cola aprobada, decisiones recientes y parámetros de sourcing. Ver OPERATIONS.md §2.
 *
 *   GET /api/operator/brief?agent=chrome
 *   Authorization: Bearer <OPERATOR_INGEST_TOKEN>
 */
const AGENTS: AgentName[] = ["chrome", "operador", "cron", "app"];

export async function GET(req: Request) {
  if (!operatorBusEnabled()) {
    return NextResponse.json(
      { error: "Bus deshabilitado: configura OPERATOR_INGEST_TOKEN en el entorno." },
      { status: 503 },
    );
  }
  if (!operatorAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const param = new URL(req.url).searchParams.get("agent");
  const agent: AgentName = AGENTS.includes(param as AgentName) ? (param as AgentName) : "chrome";

  try {
    const brief = await buildBrief(agent);
    await logRun({
      agent,
      action: "brief",
      summary: `Pase por el brain: ${brief.queue.length} en cola · ${brief.state.counts.candidatos} candidatos conocidos`,
      meta: { queue: brief.queue.length },
    });
    return NextResponse.json({ ok: true, ...brief });
  } catch (e) {
    console.error("[brief] fallo:", e);
    return NextResponse.json({ error: "Fallo al armar el brief." }, { status: 500 });
  }
}
