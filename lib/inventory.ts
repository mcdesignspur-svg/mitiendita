/**
 * Inventario (Fase 3) — `Product.stock` es el saldo acumulado de
 * `InventoryMovement`. Toda entrada/salida pasa por `adjustStock`, que actualiza
 * el saldo y deja el movimiento como rastro. Ver OPERATIONS.md §3.
 */
import { adjustProductStock, createInventoryMovement } from "./db";
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
  // Ajuste ATÓMICO en el adaptador (A-7): aplica el delta con piso en 0 en una
  // sola operación read-modify-write (file) / UPDATE...RETURNING (pg), eliminando
  // el race que rompía el invariante stock === Σ movimientos. Devuelve el delta
  // REALMENTE aplicado (acotado a 0) para registrar el movimiento consistente.
  const result = await adjustProductStock(input.productId, input.delta);
  if (!result) return null; // producto inexistente
  const { product, applied } = result;
  if (applied === 0) return null; // ya estaba en 0 y se intentó restar más
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
