/**
 * Ingreso compartido al "brain" (la columna de datos).
 *
 * Lo usan TANTO el CLI del operador (lib/operator.ts) COMO el webhook
 * (app/api/operator/ingest), así cualquier agente —Hermes (computer use), un cron,
 * Zapier, o yo— deposita candidatos/suplidores en la MISMA base (Neon o file).
 */
import { createCandidate, createSupplier, createQuote } from "./db";
import { createTask, logRun } from "./control";
import { scoreFor } from "./sourcing";
import { safeUrl, safeImageUrl } from "./url-safe";
import type { AgentName, Quote, SourcingCandidate, Supplier } from "./types";

export type CandidateInput = Partial<SourcingCandidate> & { name: string };
export type SupplierInput = Partial<Supplier> & { name: string };
export type QuoteInput = Partial<Quote> & { productName?: string };

// --- Límites de longitud de strings (A-3) ------------------------------------------
const LEN = {
  name: 300,
  signal: 300,
  notes: 2000,
  supplier: 300,
  category: 200,
  supplierName: 300,
  productName: 300,
} as const;

function clampStr(s: unknown, max: number): string {
  const str = typeof s === "string" ? s : "";
  return str.slice(0, max);
}

/** Clamp numérico: asegura que el valor es un número finito >= 0. */
function clampNum(n: unknown, fallback = 0): number {
  const v = typeof n === "number" ? n : parseFloat(String(n ?? ""));
  if (!isFinite(v) || v < 0) return fallback;
  return v;
}

function normalizeQuote(q: QuoteInput, agent: AgentName): Omit<Quote, "id" | "createdAt"> {
  return {
    supplierId: q.supplierId,
    supplierName: clampStr(q.supplierName ?? "", LEN.supplierName),
    candidateId: q.candidateId,
    productName: clampStr(q.productName ?? "", LEN.productName),
    // A-3: clamp numéricos >= 0
    unitCost: clampNum(q.unitCost),
    moq: q.moq !== undefined ? clampNum(q.moq) : undefined,
    leadTimeDays: q.leadTimeDays,
    sampleCost: q.sampleCost !== undefined ? clampNum(q.sampleCost) : undefined,
    shippingToPR: q.shippingToPR !== undefined ? clampNum(q.shippingToPR) : undefined,
    currency: q.currency ?? "USD",
    validUntil: q.validUntil,
    notes: clampStr(q.notes ?? "", LEN.notes),
    origin: q.origin ?? agent,
  };
}

export function normalizeCandidate(c: CandidateInput): Omit<SourcingCandidate, "id" | "createdAt"> {
  // A-3: Validar URLs con safeUrl/safeImageUrl — descarta javascript: y similares.
  const sourceUrl = safeUrl(c.sourceUrl);
  const imageUrl = safeImageUrl(c.imageUrl);

  return {
    // A-3: Cap de longitud en strings de entrada de agentes externos.
    name: clampStr(c.name, LEN.name),
    emoji: c.emoji ?? "📦",
    category: clampStr(c.category ?? "General", LEN.category),
    supplier: clampStr(c.supplier ?? "", LEN.supplier),
    supplierId: c.supplierId,
    // A-3: Clamp numéricos >= 0.
    unitCost: clampNum(c.unitCost),
    estRetail: clampNum(c.estRetail),
    estWholesale: c.estWholesale !== undefined ? clampNum(c.estWholesale) : undefined,
    moq: c.moq !== undefined ? clampNum(c.moq) : undefined,
    trend: c.trend ?? 0.5,
    shipping: clampNum(c.shipping, 0.4),
    stage: c.stage ?? "Detectado",
    signal: clampStr(c.signal ?? "", LEN.signal),
    // A-3: URLs saneadas (undefined si inválidas).
    sourceUrl,
    imageUrl,
    notes: c.notes !== undefined ? clampStr(c.notes, LEN.notes) : undefined,
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
  const agent = opts.agent ?? "hermes";

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
