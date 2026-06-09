/**
 * Plano de control — el cerebro de la operación AI-first (ver OPERATIONS.md §2/§4).
 *
 * Tres responsabilidades:
 *  1. createTask()      — abre un gate de aprobación para Miguel (dinero / contacto
 *                         externo / publicación). Nada cruza un gate sin su OK.
 *  2. logRun()          — deja rastro de lo que hizo un agente/cron (bitácora).
 *                         Best-effort: nunca tira.
 *  3. dispatchApproval()— ejecuta el efecto de una tarea al aprobarse, por `kind`.
 *  4. buildBrief()      — el "pase por el brain": Hermes (el agente de computer
 *                         use, stateless) lo lee como paso 0 de cada corrida.
 */
import {
  createApprovalTask,
  createAgentRun,
  createPurchaseOrder,
  getCampaignById,
  getPurchaseOrderById,
  getSupplierById,
  updateCampaign,
  listApprovalTasks,
  listCandidates,
  listQuotes,
  listSuppliers,
  updateCandidate,
  updateProduct,
  updatePurchaseOrder,
  updateSupplier,
} from "./db";
import { adjustStock } from "./inventory";
import { SURTIDO_RULE } from "./ai";
import type { AgentName, AgentRun, ApprovalKind, ApprovalTask, PurchaseOrder } from "./types";

/** Redondea a 2 decimales (dinero). */
function money2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Kinds que ejecuta Hermes en Alibaba (aparecen en su cola del brief). */
const HERMES_KINDS = new Set<ApprovalKind>(["outreach"]);

/** Criterios de sourcing vigentes (env-overridables en el futuro). */
export const SOURCING_PARAMETERS = {
  targetMargin: 0.6,
  maxMoq: 200,
  /** Tope de candidatos nuevos por corrida: Hermes corre desatendido (schedule). */
  maxPerRun: 8,
  categories: ["Auto & Gasolinera", "Tech & Gadgets", "Hogar Viral", "Impulso & Conveniencia"],
  avoid: ["belleza", "bienestar", "skincare", "suplementos", "salud", "eléctricos sin certificación"],
};

// ===========================================================================
// Gates de aprobación
// ===========================================================================
export async function createTask(input: {
  kind: ApprovalKind;
  title: string;
  summary?: string;
  createdBy?: AgentName;
  payload?: Record<string, unknown>;
  relatedType?: ApprovalTask["relatedType"];
  relatedId?: string;
}): Promise<ApprovalTask> {
  return createApprovalTask({
    kind: input.kind,
    title: input.title,
    summary: input.summary ?? "",
    createdBy: input.createdBy ?? "operador",
    payload: input.payload,
    relatedType: input.relatedType,
    relatedId: input.relatedId,
  });
}

// ===========================================================================
// Bitácora
// ===========================================================================
export async function logRun(input: {
  agent: AgentName;
  action: string;
  status?: AgentRun["status"];
  summary?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await createAgentRun({
      agent: input.agent,
      action: input.action,
      status: input.status ?? "ok",
      summary: input.summary ?? "",
      meta: input.meta,
    });
  } catch (e) {
    // La bitácora nunca debe romper el flujo principal.
    console.error("[control] no se pudo registrar AgentRun:", e);
  }
}

// ===========================================================================
// Dispatcher: el efecto de aprobar, según el kind
// ===========================================================================
export interface DispatchResult {
  ok: boolean;
  message: string;
}

export async function dispatchApproval(task: ApprovalTask): Promise<DispatchResult> {
  switch (task.kind) {
    case "candidato": {
      const cid = task.relatedId ?? (task.payload?.candidateId as string | undefined);
      if (!cid) return { ok: false, message: "Tarea sin candidato asociado." };
      await updateCandidate(cid, { stage: "Evaluando" });
      return { ok: true, message: "Candidato aprobado → pasa a Evaluando (listo para cotizar)." };
    }
    case "outreach": {
      // El mensaje aprobado queda en la cola del brief para que Hermes lo envíe en Alibaba.
      const sid = task.relatedId ?? (task.payload?.supplierId as string | undefined);
      if (sid) {
        const s = await getSupplierById(sid);
        if (s && s.status === "nuevo") await updateSupplier(sid, { status: "contactado" });
      }
      return { ok: true, message: "Outreach aprobado → encolado para Hermes." };
    }
    case "activar_producto": {
      const pid = task.relatedId ?? (task.payload?.productId as string | undefined);
      if (!pid) return { ok: false, message: "Tarea sin producto asociado." };
      await updateProduct(pid, { active: true });
      return { ok: true, message: "Producto activado en la tienda." };
    }
    case "orden_compra": {
      const poId = task.relatedId ?? (task.payload?.purchaseOrderId as string | undefined);
      if (!poId) return { ok: false, message: "Tarea sin orden de compra asociada." };
      const po = await getPurchaseOrderById(poId);
      if (!po) return { ok: false, message: "La orden de compra ya no existe." };
      if (po.status === "borrador") await updatePurchaseOrder(poId, { status: "enviada" });
      return { ok: true, message: "Orden de compra aprobada → enviada al suplidor." };
    }
    case "recibo": {
      const poId = task.relatedId ?? (task.payload?.purchaseOrderId as string | undefined);
      if (!poId) return { ok: false, message: "Tarea sin orden de compra asociada." };
      return receivePurchaseOrder(poId, "app");
    }
    case "recompra": {
      const p = task.payload ?? {};
      const productId = (p.productId as string | undefined) ?? task.relatedId;
      const qty = Math.max(1, Math.round(Number(p.qty) || 100));
      const unitCost = Number(p.unitCost) || 0;
      const po = await createPurchaseOrder({
        supplierId: p.supplierId as string | undefined,
        supplierName: (p.supplierName as string) || "Suplidor por definir",
        productId,
        productName: (p.productName as string) || "Reabastecimiento",
        qty,
        unitCost,
        total: money2(qty * unitCost),
        currency: "USD",
        createdBy: "cron",
        status: "enviada",
      });
      return { ok: true, message: `Recompra aprobada → orden de compra creada (${po.qty} uds, enviada).` };
    }
    case "promocion": {
      const cid = task.relatedId ?? (task.payload?.campaignId as string | undefined);
      if (!cid) return { ok: false, message: "Tarea sin campaña asociada." };
      const camp = await getCampaignById(cid);
      if (!camp) return { ok: false, message: "La campaña ya no existe." };
      await updateCampaign(cid, { status: "activa", startsAt: camp.startsAt ?? new Date().toISOString() });
      for (const pid of camp.productIds) {
        await updateProduct(pid, { discountPercent: camp.discountPercent });
      }
      return { ok: true, message: `Promoción activa: ${camp.discountPercent}% en ${camp.productIds.length} productos.` };
    }
    default:
      return {
        ok: true,
        message: "Aprobada. (El efecto automático de este tipo llega en una fase próxima.)",
      };
  }
}

// ===========================================================================
// Loop de compra: redactar una orden de compra + su gate
// ===========================================================================
export async function draftPurchaseOrder(input: {
  supplierId?: string;
  supplierName: string;
  candidateId?: string;
  productId?: string;
  quoteId?: string;
  productName: string;
  qty: number;
  unitCost: number;
  shippingCost?: number;
  createdBy?: AgentName;
  notes?: string;
  status?: PurchaseOrder["status"];
}): Promise<PurchaseOrder> {
  const createdBy = input.createdBy ?? "operador";
  const total = money2(input.qty * input.unitCost + (input.shippingCost ?? 0));
  const po = await createPurchaseOrder({
    supplierId: input.supplierId,
    supplierName: input.supplierName,
    candidateId: input.candidateId,
    productId: input.productId,
    quoteId: input.quoteId,
    productName: input.productName,
    qty: input.qty,
    unitCost: input.unitCost,
    shippingCost: input.shippingCost,
    total,
    currency: "USD",
    createdBy,
    notes: input.notes,
    status: input.status,
  });
  // Gate de dinero: aprobar antes de enviar al suplidor.
  await createTask({
    kind: "orden_compra",
    title: `Aprobar orden de compra: ${po.qty}× ${po.productName}`,
    summary: `${po.supplierName} · ${po.qty} uds × $${po.unitCost} = $${po.total}. Aprobar para enviar al suplidor.`,
    createdBy,
    relatedType: "purchase_order",
    relatedId: po.id,
    payload: { purchaseOrderId: po.id, supplierId: po.supplierId },
  });
  await logRun({
    agent: createdBy,
    action: "po:draft",
    summary: `OC borrador ${po.qty}× ${po.productName} ($${po.total})`,
    meta: { purchaseOrderId: po.id },
  });
  return po;
}

/**
 * Recibe una orden de compra: la marca `recibida` y sube el inventario del
 * producto enlazado (si lo hay). Idempotente.
 */
export async function receivePurchaseOrder(
  poId: string,
  createdBy: AgentName = "app",
): Promise<DispatchResult> {
  const po = await getPurchaseOrderById(poId);
  if (!po) return { ok: false, message: "Orden de compra no encontrada." };
  if (po.status === "recibida") return { ok: true, message: "La orden ya estaba recibida." };
  await updatePurchaseOrder(poId, { status: "recibida" });
  if (po.productId) {
    await adjustStock({
      productId: po.productId,
      delta: po.qty,
      reason: "recibo",
      ref: po.id,
      createdBy,
    });
    await logRun({
      agent: createdBy,
      action: "recibo",
      summary: `+${po.qty} al inventario de ${po.productName} (OC ${po.id})`,
      meta: { purchaseOrderId: po.id, productId: po.productId, qty: po.qty },
    });
    return { ok: true, message: `Recibido: +${po.qty} al inventario de ${po.productName}.` };
  }
  await logRun({
    agent: createdBy,
    action: "recibo",
    summary: `OC ${po.id} recibida (sin producto del catálogo enlazado)`,
    meta: { purchaseOrderId: po.id },
  });
  return {
    ok: true,
    message: "OC marcada como recibida. No tiene producto del catálogo enlazado, así que no se ajustó inventario.",
  };
}

// ===========================================================================
// El pase por el brain (brief) — la memoria de Hermes (stateless)
// ===========================================================================
export interface OperatorBrief {
  generatedAt: string;
  agent: AgentName;
  rules: { identity: string; surtido: string; gates: string[] };
  parameters: typeof SOURCING_PARAMETERS;
  state: {
    candidatesKnown: { name: string; stage: string; sourceUrl?: string }[];
    suppliersKnown: { name: string; status: string }[];
    quotesRecent: { productName: string; supplierName: string; unitCost: number }[];
    counts: Record<string, number>;
  };
  queue: { id: string; kind: ApprovalKind; title: string; payload?: Record<string, unknown> }[];
  recentDecisions: { kind: ApprovalKind; title: string; status: string; note?: string }[];
  /** Digest en markdown, listo para que Claude-en-el-navegador lo lea de corrido. */
  briefing: string;
}

const IDENTITY =
  "Eres el conector de Alibaba de Mi Tiendita PR (tienda boricua de productos virales/de alta utilidad). " +
  "No tienes memoria entre corridas: este brief ES tu memoria. Trabajas read → act → write → log. " +
  "Descubres productos que encajen, los depositas por POST /api/operator/ingest, y SOLO contactas suplidores " +
  "cuando hay una tarea de outreach APROBADA en tu cola.";

const GATES = [
  "No contactes suplidores sin una tarea de outreach aprobada (en `queue`).",
  "No inventes precios 'confirmados': marca los estimados como estimados.",
  "No dupliques: revisa `state.candidatesKnown` y `state.suppliersKnown` antes de depositar.",
  "Respeta el surtido: nunca propongas belleza/bienestar/skincare/suplementos/salud.",
  "Calíbrate con `recentDecisions`: no traigas más de lo que Miguel rechazó.",
];

export async function buildBrief(agent: AgentName = "hermes"): Promise<OperatorBrief> {
  const [candidates, suppliers, tasks, quotes] = await Promise.all([
    listCandidates(),
    listSuppliers(),
    listApprovalTasks(),
    listQuotes(),
  ]);

  // Cola FIFO (lo aprobado más viejo primero) para que nada se quede rezagado.
  const queue = tasks
    .filter((t) => t.status === "aprobada" && !t.executedAt && HERMES_KINDS.has(t.kind))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((t) => ({ id: t.id, kind: t.kind, title: t.title, payload: t.payload }));

  const recentDecisions = tasks
    .filter((t) => t.status !== "pendiente")
    .slice(0, 10)
    .map((t) => ({ kind: t.kind, title: t.title, status: t.status, note: t.decisionNote }));

  const counts: Record<string, number> = {
    candidatosPendientes: tasks.filter((t) => t.kind === "candidato" && t.status === "pendiente").length,
    enCola: queue.length,
    candidatos: candidates.length,
    suplidores: suppliers.length,
  };

  const base: Omit<OperatorBrief, "briefing"> = {
    generatedAt: new Date().toISOString(),
    agent,
    rules: { identity: IDENTITY, surtido: SURTIDO_RULE, gates: GATES },
    parameters: SOURCING_PARAMETERS,
    state: {
      candidatesKnown: candidates.map((c) => ({ name: c.name, stage: c.stage, sourceUrl: c.sourceUrl })),
      suppliersKnown: suppliers.map((s) => ({ name: s.name, status: s.status })),
      quotesRecent: quotes.slice(0, 15).map((q) => ({ productName: q.productName, supplierName: q.supplierName, unitCost: q.unitCost })),
      counts,
    },
    queue,
    recentDecisions,
  };
  return { ...base, briefing: renderBriefing(base, candidates) };
}

function renderBriefing(
  b: Omit<OperatorBrief, "briefing">,
  candidates: Awaited<ReturnType<typeof listCandidates>>,
): string {
  const lines: string[] = [];
  lines.push(`# Brief — ${b.agent} · ${b.generatedAt}`);
  lines.push("");
  lines.push("## Quién eres");
  lines.push(b.rules.identity);
  lines.push("");
  lines.push("## Reglas (gates)");
  for (const g of b.rules.gates) lines.push(`- ${g}`);
  lines.push("");
  lines.push("## Parámetros de sourcing");
  lines.push(`- Margen objetivo: ≥${Math.round(b.parameters.targetMargin * 100)}% · MOQ techo: ${b.parameters.maxMoq}`);
  lines.push(`- Máx candidatos nuevos por corrida: ${b.parameters.maxPerRun} (corres desatendida — no te desbordes).`);
  lines.push(`- Categorías foco: ${b.parameters.categories.join(", ")}`);
  lines.push(`- Evitar: ${b.parameters.avoid.join(", ")}`);
  lines.push("");

  lines.push(`## Tu cola (tareas aprobadas: ${b.queue.length})`);
  if (b.queue.length === 0) {
    lines.push("- (vacía) — descubre candidatos nuevos según los parámetros y deposítalos por /ingest.");
  } else {
    for (const t of b.queue) {
      const supplier = (t.payload?.supplierId as string) || "";
      lines.push(`- [${t.id}] ${t.title}${supplier ? ` (supplier ${supplier})` : ""} → al terminar: POST /api/operator/queue/${t.id}/done`);
    }
  }
  lines.push("");

  lines.push(`## Ya conocidos — NO dupliques (candidatos: ${candidates.length})`);
  for (const c of candidates.slice(0, 25)) {
    lines.push(`- ${c.name} · ${c.stage}${c.sourceUrl ? ` · ${c.sourceUrl}` : ""}`);
  }
  lines.push("");
  lines.push(`## Suplidores conocidos (${b.state.suppliersKnown.length})`);
  for (const s of b.state.suppliersKnown.slice(0, 25)) lines.push(`- ${s.name} · ${s.status}`);
  lines.push("");

  if (b.state.quotesRecent.length) {
    lines.push(`## Cotizaciones recientes (${b.state.quotesRecent.length}) — no re-cotices lo mismo`);
    for (const q of b.state.quotesRecent) {
      lines.push(`- ${q.productName} · ${q.supplierName} · $${q.unitCost}/u`);
    }
    lines.push("");
  }

  if (b.recentDecisions.length) {
    lines.push("## Decisiones recientes (calíbrate)");
    for (const d of b.recentDecisions) {
      lines.push(`- ${d.status.toUpperCase()} · ${d.title}${d.note ? ` — “${d.note}”` : ""}`);
    }
  }
  return lines.join("\n");
}
