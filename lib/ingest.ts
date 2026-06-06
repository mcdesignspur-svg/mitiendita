/**
 * Ingreso compartido al "brain" (la columna de datos).
 *
 * Lo usan TANTO el CLI del operador (lib/operator.ts) COMO el webhook
 * (app/api/operator/ingest), así cualquier agente —el Claude de Chrome, un cron,
 * Zapier, o yo— deposita candidatos/suplidores en la MISMA base (Neon o file).
 */
import { createCandidate, createSupplier } from "./db";
import { scoreFor } from "./sourcing";
import type { SourcingCandidate, Supplier } from "./types";

export type CandidateInput = Partial<SourcingCandidate> & { name: string };
export type SupplierInput = Partial<Supplier> & { name: string };

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
    notes: c.notes,
    origin: c.origin ?? "agente",
    productId: c.productId,
  };
}

export interface IngestResult {
  candidates: { id: string; name: string; emoji: string; score: number }[];
  suppliers: { id: string; name: string; platform: string }[];
}

/** Escribe suplidores (primero) y candidatos en la DB. Devuelve un resumen. */
export async function ingestPayload(payload: {
  candidates?: CandidateInput[];
  suppliers?: SupplierInput[];
}): Promise<IngestResult> {
  const suppliers: IngestResult["suppliers"] = [];
  for (const s of payload.suppliers ?? []) {
    const created = await createSupplier({ ...s, name: s.name, platform: s.platform ?? "Alibaba" });
    suppliers.push({ id: created.id, name: created.name, platform: created.platform });
  }

  const candidates: IngestResult["candidates"] = [];
  for (const c of payload.candidates ?? []) {
    const created = await createCandidate(normalizeCandidate(c));
    candidates.push({ id: created.id, name: created.name, emoji: created.emoji, score: scoreFor(created) });
  }

  return { candidates, suppliers };
}
