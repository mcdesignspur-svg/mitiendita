/**
 * Ingreso compartido al "brain" (la columna de datos).
 *
 * Lo usan TANTO el CLI del operador (lib/operator.ts) COMO el webhook
 * (app/api/operator/ingest), así cualquier agente —el Claude de Chrome, un cron,
 * Zapier, o yo— deposita candidatos/suplidores en la MISMA base (Neon o file).
 */
import { createCandidate, createSupplier, createQuote } from "./db";
import { createTask, logRun } from "./control";
import { scoreFor } from "./sourcing";
import type { AgentName, Quote, SourcingCandidate, Supplier } from "./types";

export type CandidateInput = Partial<SourcingCandidate> & { name: string };
export type SupplierInput = Partial<Supplier> & { name: string };
export type QuoteInput = Partial<Quote> & { productName?: string };

function normalizeQuote(q: QuoteInput, agent: AgentName): Omit<Quote, "id" | "createdAt"> {
  return {
    supplierId: q.supplierId,
    supplierName: q.supplierName ?? "",
    candidateId: q.candidateId,
    productName: q.productName ?? "",
    unitCost: q.unitCost ?? 0,
    moq: q.moq,
    leadTimeDays: q.leadTimeDays,
    sampleCost: q.sampleCost,
    shippingToPR: q.shippingToPR,
    currency: q.currency ?? "USD",
    validUntil: q.validUntil,
    notes: q.notes,
    origin: q.origin ?? agent,
  };
}

export function normalizeCandidate(c: CandidateInput): Omit<SourcingCandidate, "id" | "createdAt"> {
  return {
    name: c.name,
    emoji: c.emoji ?? "📦",
    category: c.category ?? "General",
    supplier: c.supplier ?? "",
    supplierId: c.supplierId,
    unitCost: c.unitCost ?? 0,
    estRetail: c.estRetail ?? 0,
    estWholesale: c.estWholesale,
    moq: c.moq,
    trend: c.trend ?? 0.5,
    shipping: c.shipping ?? 0.4,
    stage: c.stage ?? "Detectado",
    signal: c.signal ?? "",
    sourceUrl: c.sourceUrl,
    imageUrl: c.imageUrl,
    notes: c.notes,
    origin: c.origin ?? "agente",
    productId: c.productId,
  };
}

export interface IngestResult {
  candidates: { id: string; name: string; emoji: string; score: number }[];
  suppliers: { id: string; name: string; platform: string }[];
  quotes: { id: string; productName: string; unitCost: number }[];
}

/**
 * Escribe suplidores (primero) y candidatos en la DB. Cada candidato nuevo abre
 * un gate "candidato" (Miguel decide si pasa a Evaluando/cotizar) y la corrida
 * queda en la bitácora. Devuelve un resumen.
 */
export async function ingestPayload(
  payload: { candidates?: CandidateInput[]; suppliers?: SupplierInput[]; quotes?: QuoteInput[] },
  opts: { agent?: AgentName } = {},
): Promise<IngestResult> {
  const agent = opts.agent ?? "chrome";

  const suppliers: IngestResult["suppliers"] = [];
  for (const s of payload.suppliers ?? []) {
    const created = await createSupplier({ ...s, name: s.name, platform: s.platform ?? "Alibaba" });
    suppliers.push({ id: created.id, name: created.name, platform: created.platform });
  }

  const quotes: IngestResult["quotes"] = [];
  for (const q of payload.quotes ?? []) {
    const created = await createQuote(normalizeQuote(q, agent));
    quotes.push({ id: created.id, productName: created.productName, unitCost: created.unitCost });
  }

  const candidates: IngestResult["candidates"] = [];
  for (const c of payload.candidates ?? []) {
    const created = await createCandidate(normalizeCandidate(c));
    const score = scoreFor(created);
    candidates.push({ id: created.id, name: created.name, emoji: created.emoji, score });
    // Gate: aprobar el candidato antes de cotizar/contactar.
    await createTask({
      kind: "candidato",
      title: `Aprobar candidato: ${created.emoji} ${created.name}`,
      summary: `Score ${score} · costo $${created.unitCost} → retail $${created.estRetail}. Aprobar para pasar a Evaluando.`,
      createdBy: agent,
      relatedType: "candidate",
      relatedId: created.id,
    });
  }

  await logRun({
    agent,
    action: "ingest",
    summary: `${candidates.length} candidatos, ${suppliers.length} suplidores, ${quotes.length} cotizaciones`,
    meta: { candidates: candidates.length, suppliers: suppliers.length, quotes: quotes.length },
  });

  return { candidates, suppliers, quotes };
}
