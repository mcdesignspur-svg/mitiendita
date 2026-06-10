/**
 * Mantenimiento diario (Fase 5) — la cadencia autónoma del operador. Lo dispara
 * el cron de Vercel (`/api/cron/daily`, ver vercel.json). Todo lo que decide
 * dinero pasa por un gate (ApprovalTask); aquí solo detecta y propone. Deja
 * rastro en la bitácora. Ver OPERATIONS.md §5.
 */
import {
  listProducts,
  listApprovalTasks,
  listPurchaseOrders,
  listSuppliers,
  listOrders,
  listCampaigns,
  updateCampaign,
  updateProduct,
  updateOrder,
} from "./db";
import { createTask, logRun } from "./control";
import { LOW_STOCK_THRESHOLD } from "./inventory";

export interface DailySummary {
  recompra: number;
  campaignsFinalized: number;
  followUps: number;
  ordersPending: number;
  ordersCancelled: number;
}

const DAY = 86_400_000;

export async function runDailyMaintenance(): Promise<DailySummary> {
  const summary: DailySummary = {
    recompra: 0,
    campaignsFinalized: 0,
    followUps: 0,
    ordersPending: 0,
    ordersCancelled: 0,
  };
  const now = Date.now();

  // a) Reabastecimiento: stock bajo → gate de recompra (sin duplicar).
  //    M-2/CR-3: excluye:
  //      1) Productos con tarea de recompra pendiente.
  //      2) Productos con una recompra aprobada (tarea aprobada sin ejecutar).
  //      3) Productos con una OC abierta (status ∉ {recibida, cancelada}).
  const [products, allTasks, purchaseOrders] = await Promise.all([
    listProducts(),
    listApprovalTasks(),
    listPurchaseOrders(),
  ]);

  // Productos con tarea de recompra pendiente o aprobada-sin-ejecutar.
  const blockedByTask = new Set(
    allTasks
      .filter(
        (t) =>
          t.kind === "recompra" &&
          (t.status === "pendiente" || (t.status === "aprobada" && !t.executedAt)),
      )
      .map((t) => t.relatedId ?? (t.payload?.productId as string | undefined))
      .filter(Boolean) as string[],
  );

  // Productos con una OC abierta (no recibida ni cancelada).
  const blockedByPO = new Set(
    purchaseOrders
      .filter((po) => po.productId && po.status !== "recibida" && po.status !== "cancelada")
      .map((po) => po.productId as string),
  );

  for (const p of products) {
    if (p.active === false) continue;
    if ((p.stock ?? 0) > LOW_STOCK_THRESHOLD) continue;
    if (blockedByTask.has(p.id)) continue;
    if (blockedByPO.has(p.id)) continue;

    const qty = Math.max(p.unitsPerCase ?? 1, p.moq ?? 1, 24);
    await createTask({
      kind: "recompra",
      title: `Reabastecer: ${p.emoji} ${p.name} (stock ${p.stock ?? 0})`,
      summary: `Stock bajo (${p.stock ?? 0} ≤ ${LOW_STOCK_THRESHOLD}). Sugerencia: ${qty} uds a $${p.landedCost}/u.`,
      createdBy: "cron",
      relatedType: "product",
      relatedId: p.id,
      payload: { productId: p.id, productName: p.name, qty, unitCost: p.landedCost },
    });
    summary.recompra++;
  }

  // b) Promociones vencidas → finalizar y quitar descuentos.
  const campaigns = await listCampaigns();
  const nowIso = new Date(now).toISOString();
  for (const c of campaigns) {
    if (c.status === "activa" && c.endsAt && c.endsAt < nowIso) {
      await updateCampaign(c.id, { status: "finalizada" });
      for (const pid of c.productIds) await updateProduct(pid, { discountPercent: 0 });
      summary.campaignsFinalized++;
    }
  }

  // c) Follow-ups: suplidores contactados sin avanzar en 5+ días.
  const suppliers = await listSuppliers();
  const fiveDaysAgo = new Date(now - 5 * DAY).toISOString();
  for (const s of suppliers) {
    if (s.status === "contactado" && s.lastContactedAt && s.lastContactedAt < fiveDaysAgo) {
      summary.followUps++;
    }
  }

  // d) Reconciliación: pedidos pendientes de pago hace 2+ días → contar.
  //    M-2/CR-3(b): cancela órdenes pendiente_pago de más de 48 h.
  const orders = await listOrders();
  const twoDaysAgo = new Date(now - 2 * DAY).toISOString();
  for (const o of orders) {
    if (o.paymentStatus !== "pendiente_pago") continue;
    if (o.createdAt >= twoDaysAgo) {
      // Reciente — solo contar.
      summary.ordersPending++;
    } else {
      // Expirada (> 48 h) — cancelar.
      await updateOrder(o.id, { paymentStatus: "fallida" });
      summary.ordersCancelled++;
    }
  }

  await logRun({
    agent: "cron",
    action: "daily",
    summary: `recompra ${summary.recompra} · campañas finalizadas ${summary.campaignsFinalized} · follow-ups ${summary.followUps} · pagos pendientes ${summary.ordersPending} · órdenes canceladas ${summary.ordersCancelled}`,
    meta: { ...summary },
  });
  return summary;
}
