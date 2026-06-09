import { NextResponse } from "next/server";
import { ingestPayload, type CandidateInput, type SupplierInput, type QuoteInput } from "@/lib/ingest";
import { operatorAuthorized, operatorBusEnabled } from "@/lib/operator-auth";
import type { AgentName } from "@/lib/types";

export const runtime = "nodejs";

const MAX_ITEMS = 50;

/**
 * Webhook de ingreso al "brain". Cualquier agente (Hermes/computer use, un cron,
 * Zapier, etc.) deposita candidatos/suplidores aquí y caen en la MISMA DB que
 * lee la página y el operador.
 *
 *   POST https://mitienditapr.net/api/operator/ingest
 *   Authorization: Bearer <OPERATOR_INGEST_TOKEN>
 *   Content-Type: application/json
 *   { "candidates": [ { "name": "...", "supplier": "...", "unitCost": 6.8,
 *       "estRetail": 27.99, "moq": 100, "sourceUrl": "https://alibaba.com/...",
 *       "signal": "..." } ], "suppliers": [ { "name": "...", "platform": "Alibaba" } ] }
 *
 * Deshabilitado si no hay OPERATOR_INGEST_TOKEN (no abrimos un endpoint de
 * escritura sin secreto).
 */
export async function POST(req: Request) {
  if (!operatorBusEnabled()) {
    return NextResponse.json(
      { error: "Ingest deshabilitado: configura OPERATOR_INGEST_TOKEN en el entorno." },
      { status: 503 },
    );
  }
  if (!operatorAuthorized(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  let body: { candidates?: CandidateInput[]; suppliers?: SupplierInput[]; quotes?: QuoteInput[]; agent?: AgentName };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const candidates = Array.isArray(body?.candidates) ? body.candidates : [];
  const suppliers = Array.isArray(body?.suppliers) ? body.suppliers : [];
  const quotes = Array.isArray(body?.quotes) ? body.quotes : [];

  if (candidates.length + suppliers.length + quotes.length === 0) {
    return NextResponse.json({ error: "Nada que ingerir (manda 'candidates', 'suppliers' y/o 'quotes')." }, { status: 400 });
  }
  if (candidates.length > MAX_ITEMS || suppliers.length > MAX_ITEMS || quotes.length > MAX_ITEMS) {
    return NextResponse.json({ error: `Máximo ${MAX_ITEMS} por tipo por request.` }, { status: 413 });
  }
  for (const c of candidates) {
    if (!c || typeof c.name !== "string" || !c.name.trim()) {
      return NextResponse.json({ error: "Cada candidato necesita un 'name'." }, { status: 400 });
    }
  }
  for (const s of suppliers) {
    if (!s || typeof s.name !== "string" || !s.name.trim()) {
      return NextResponse.json({ error: "Cada suplidor necesita un 'name'." }, { status: 400 });
    }
  }

  try {
    const result = await ingestPayload({ candidates, suppliers, quotes }, { agent: body.agent ?? "hermes" });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[ingest webhook] fallo:", e);
    return NextResponse.json({ error: "Fallo al ingerir." }, { status: 500 });
  }
}
