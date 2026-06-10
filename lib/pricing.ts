// Resolver de precios server-side — la única fuente de verdad del checkout.
//
// El cliente SOLO envía intención: [{ productId, qty }]. NUNCA confiamos en
// precios, nombres ni envío que vengan del navegador (CR-1). Aquí recargamos
// cada producto desde la DB, derivamos el precio según la sesión (retail con
// descuento, o mayorista si el negocio está verificado), validamos stock/MOQ,
// y recomputamos subtotal/envío/total con aritmética de centavos (money2).
//
// `kind` y `businessId` se derivan SIEMPRE de la sesión (getSessionBusiness),
// nunca del FormData: un cliente no puede declararse "b2b" ni reclamar precios
// mayoristas sin una sesión de negocio verificado.

import { getProductById } from "./db";
import { getSessionBusiness } from "./auth";
import { effectiveRetail } from "./products";
import { money2 } from "./money";
import type { OrderItem } from "./types";

/**
 * Mínimo de pedido mayorista (B2B), en USD. Reemplaza el viejo MOQ por SKU:
 * el negocio mezcla los productos que quiera y solo tiene que llegar a este
 * subtotal de mercancía. Mata la exclusión del negocio pequeño (el cuello de
 * botella del canal) sin regalar precio mayorista en compras diminutas.
 * Tunable aquí. Ver ESTRATEGIA-B2B.md.
 */
export const B2B_MIN_ORDER_USD = 50;

/** Línea de intención que envía el cliente: solo id + cantidad. */
export interface CartIntentLine {
  productId: string;
  qty: number;
}

/** Línea ya resuelta y verificada server-side, lista para mostrar/cobrar. */
export interface PricedLine extends OrderItem {
  /** Datos de presentación recalculados desde la DB (no del cliente). */
  slug: string;
  emoji: string;
  shippingPrice: number;
}

export interface PricedCart {
  kind: "b2c" | "b2b";
  businessId?: string;
  /** True si la sesión es un negocio verificado (precio mayorista activo). */
  wholesale: boolean;
  items: OrderItem[];
  /** Líneas con datos de presentación (para el carrito). */
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  total: number;
}

export interface PricedCartError {
  error: string;
}

/** Normaliza la entrada cruda del cliente a [{productId, qty}] descartando basura. */
export function parseIntentLines(input: unknown): CartIntentLine[] {
  if (!Array.isArray(input)) return [];
  const out: CartIntentLine[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const productId = String(r.productId ?? "").trim();
    const qty = Number(r.qty);
    if (!productId) continue;
    out.push({ productId, qty: Number.isFinite(qty) ? qty : 0 });
  }
  return out;
}

/**
 * Recalcula el carrito server-side. Carga cada producto, deriva el precio según
 * la sesión, valida stock/MOQ y recomputa los totales. Devuelve `{ error }` si
 * algo no cuadra (producto inexistente/inactivo, qty inválida, sin stock,
 * MOQ no alcanzado). Nunca confía en precios/nombres del cliente.
 */
export async function priceCart(
  intent: CartIntentLine[],
): Promise<PricedCart | PricedCartError> {
  if (!intent.length) return { error: "Tu carrito está vacío." };

  const business = await getSessionBusiness();
  const wholesale = business?.status === "verified";
  const kind: "b2c" | "b2b" = wholesale ? "b2b" : "b2c";
  const businessId = wholesale ? business?.id : undefined;

  // Consolida cantidades repetidas por productId (defensa contra duplicados).
  const byId = new Map<string, number>();
  for (const line of intent) {
    byId.set(line.productId, (byId.get(line.productId) ?? 0) + line.qty);
  }

  const lines: PricedLine[] = [];
  let subtotal = 0;
  let shipping = 0;

  for (const [productId, qty] of byId) {
    if (!Number.isInteger(qty) || qty <= 0) {
      return { error: "Cantidad inválida en el carrito." };
    }
    const product = await getProductById(productId);
    if (!product || product.active === false) {
      return { error: "Uno de los productos ya no está disponible. Revisa tu carrito." };
    }
    if (qty > product.stock) {
      return {
        error: `No hay suficiente inventario de "${product.name}" (quedan ${product.stock}).`,
      };
    }

    // Precio derivado server-side. Mayorista solo con sesión verificada.
    // No hay mínimo por SKU: el negocio compra desde 1 unidad a precio
    // mayorista. El mínimo es por pedido completo (B2B_MIN_ORDER_USD) y se
    // valida abajo, una vez sumado el subtotal de mercancía.
    const unitPrice = wholesale ? product.wholesale : effectiveRetail(product);

    const lineShipping = Math.max(0, product.shippingPrice ?? 0);
    if (lineShipping > shipping) shipping = lineShipping;
    subtotal = money2(subtotal + money2(unitPrice * qty));

    lines.push({
      productId: product.id,
      name: product.name,
      qty,
      unitPrice: money2(unitPrice),
      slug: product.slug,
      emoji: product.emoji,
      shippingPrice: lineShipping,
    });
  }

  subtotal = money2(subtotal);
  shipping = money2(shipping);

  // Mínimo de pedido mayorista: el negocio mezcla libremente, pero el subtotal
  // de mercancía debe alcanzar B2B_MIN_ORDER_USD (reemplaza el MOQ por SKU).
  if (wholesale && subtotal < B2B_MIN_ORDER_USD) {
    return {
      error: `El pedido mayorista mínimo es $${B2B_MIN_ORDER_USD.toFixed(2)}. Te faltan $${(B2B_MIN_ORDER_USD - subtotal).toFixed(2)}.`,
    };
  }
  const total = money2(subtotal + shipping);
  const items: OrderItem[] = lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    qty: l.qty,
    unitPrice: l.unitPrice,
  }));

  return { kind, businessId, wholesale, items, lines, subtotal, shipping, total };
}

/** Type guard para distinguir el resultado de error. */
export function isPricedError(r: PricedCart | PricedCartError): r is PricedCartError {
  return (r as PricedCartError).error !== undefined;
}

/**
 * Versión TOLERANTE para MOSTRAR el carrito (no para cobrar). En vez de
 * rechazar todo el carrito ante una línea inválida, descarta esa línea (limita
 * la cantidad al stock, omite productos inactivos/borrados) y devuelve las
 * líneas que sí se pueden vender, con sus totales recalculados. El precio sigue
 * derivándose 100% server-side. El cobro real siempre pasa por `priceCart`
 * (estricto). `notice` describe cualquier ajuste para avisar al cliente.
 */
export async function priceCartForDisplay(
  intent: CartIntentLine[],
): Promise<PricedCart & { notice?: string; minOrder: number; belowMin: boolean }> {
  const business = await getSessionBusiness();
  const wholesale = business?.status === "verified";
  const kind: "b2c" | "b2b" = wholesale ? "b2b" : "b2c";
  const businessId = wholesale ? business?.id : undefined;

  const byId = new Map<string, number>();
  for (const line of intent) {
    if (!line.productId) continue;
    byId.set(line.productId, (byId.get(line.productId) ?? 0) + line.qty);
  }

  const lines: PricedLine[] = [];
  let subtotal = 0;
  let shipping = 0;
  let adjusted = false;

  for (const [productId, rawQty] of byId) {
    const qty = Math.max(0, Math.floor(rawQty));
    if (qty <= 0) continue;
    const product = await getProductById(productId);
    if (!product || product.active === false || product.stock <= 0) {
      adjusted = true;
      continue;
    }
    const cappedQty = Math.min(qty, product.stock);
    if (cappedQty !== qty) adjusted = true;

    const unitPrice = wholesale ? product.wholesale : effectiveRetail(product);
    const lineShipping = Math.max(0, product.shippingPrice ?? 0);
    if (lineShipping > shipping) shipping = lineShipping;
    subtotal = money2(subtotal + money2(unitPrice * cappedQty));

    lines.push({
      productId: product.id,
      name: product.name,
      qty: cappedQty,
      unitPrice: money2(unitPrice),
      slug: product.slug,
      emoji: product.emoji,
      shippingPrice: lineShipping,
    });
  }

  subtotal = money2(subtotal);
  shipping = money2(shipping);
  const total = money2(subtotal + shipping);
  const items: OrderItem[] = lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    qty: l.qty,
    unitPrice: l.unitPrice,
  }));

  // Mínimo de pedido mayorista (informativo aquí; el cobro lo bloquea priceCart).
  const minOrder = wholesale ? B2B_MIN_ORDER_USD : 0;
  const belowMin = wholesale && subtotal > 0 && subtotal < minOrder;
  const notices: string[] = [];
  if (adjusted) notices.push("Ajustamos tu carrito: algún producto cambió de disponibilidad.");
  if (belowMin) {
    notices.push(
      `Pedido mayorista mínimo $${minOrder.toFixed(2)} · te faltan $${(minOrder - subtotal).toFixed(2)}.`,
    );
  }

  return {
    kind,
    businessId,
    wholesale,
    items,
    lines,
    subtotal,
    shipping,
    total,
    minOrder,
    belowMin,
    notice: notices.length ? notices.join(" ") : undefined,
  };
}
