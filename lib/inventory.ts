/**
 * Inventario (Fase 3) — `Product.stock` es el saldo acumulado de
 * `InventoryMovement`. Toda entrada/salida pasa por `adjustStock`, que actualiza
 * el saldo y deja el movimiento como rastro. Ver OPERATIONS.md §3.
 */
import { getProductById, updateProduct, createInventoryMovement } from "./db";
import type { AgentName, InventoryMovement, InventoryReason, Order } from "./types";

/** Umbral por defecto para disparar recompra (stock bajo). */
export const LOW_STOCK_THRESHOLD = 6;

/**
 * Ajusta el stock de un producto y registra el movimiento. `delta` positivo =
 * entrada, negativo = salida. Nunca baja de 0; registra el delta REALMENTE
 * aplicado para que la suma de movimientos == stock. Devuelve null si el
 * producto no existe o si el ajuste no cambió nada.
 */
export async function adjustStock(input: {
  productId: string;
  delta: number;
  reason: InventoryReason;
  ref?: string;
  note?: string;
  createdBy?: AgentName;
}): Promise<InventoryMovement | null> {
  const product = await getProductById(input.productId);
  if (!product) return null;
  const current = product.stock ?? 0;
  const next = Math.max(0, current + input.delta);
  const applied = next - current;
  if (applied === 0) return null;
  await updateProduct(input.productId, { stock: next });
  return createInventoryMovement({
    productId: product.id,
    productName: product.name,
    delta: applied,
    reason: input.reason,
    ref: input.ref,
    note: input.note,
    createdBy: input.createdBy ?? "operador",
  });
}

/**
 * Descuenta inventario por una venta (reserva al crear la orden). Best-effort:
 * nunca tira — el checkout nunca debe romperse por inventario.
 */
export async function applyOrderInventory(order: Pick<Order, "id" | "items">): Promise<void> {
  for (const it of order.items) {
    if (!it.productId) continue;
    try {
      await adjustStock({
        productId: it.productId,
        delta: -Math.abs(it.qty),
        reason: "venta",
        ref: order.id,
        createdBy: "app",
      });
    } catch {
      /* no romper el checkout */
    }
  }
}
