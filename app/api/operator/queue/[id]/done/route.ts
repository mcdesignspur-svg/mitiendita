import { NextResponse } from "next/server";
import { getApprovalTaskById, updateApprovalTask } from "@/lib/db";
import { logRun } from "@/lib/control";
import { operatorAuthorized, operatorBusEnabled } from "@/lib/operator-auth";

export const runtime = "nodejs";

/**
 * Ack del queue — Hermes reporta que ejecutó una tarea aprobada (ej. envió
 * el outreach en Alibaba). La saca de su cola del brief y deja rastro. Ver
 * OPERATIONS.md §2 (read → act → write → log).
 *
 *   POST /api/operator/queue/<taskId>/done
 *   Authorization: Bearer <OPERATOR_INGEST_TOKEN>
 *   { "result": "enviado", "note": "respondió en 2h" }   // body opcional
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!operatorBusEnabled()) {
    return NextResponse.json({ error: "Bus deshabilitado." }, { status: 503 });
  }
  if (!operatorAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const task = await getApprovalTaskById(id);
  if (!task) return NextResponse.json({ error: "Tarea no encontrada." }, { status: 404 });
  if (task.status !== "aprobada") {
    return NextResponse.json({ error: "Solo se reportan tareas aprobadas." }, { status: 409 });
  }
  if (task.executedAt) {
    return NextResponse.json({ ok: true, alreadyDone: true });
  }

  let result: Record<string, unknown> = {};
  try {
    result = await req.json();
  } catch {
    /* body opcional */
  }

  await updateApprovalTask(id, { executedAt: new Date().toISOString() });
  await logRun({
    agent: "hermes",
    action: "queue:done",
    summary: `Ejecutada: ${task.title}`,
    meta: { taskId: id, result },
  });
  return NextResponse.json({ ok: true });
}
