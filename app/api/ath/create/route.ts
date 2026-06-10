import { NextResponse } from "next/server";
import { createOrder } from "@/lib/db";
import { athEnabled } from "@/lib/athmovil";
import { priceCart, parseIntentLines, isPricedError } from "@/lib/pricing";

export const runtime = "nodejs";

/**
 * Crea la orden ATH Móvil (pendiente_pago) para renderizar el botón en el
 * carrito. CR-1: el cliente solo manda intención [{productId, qty}]; precios,
 * envío y total se recalculan server-side (priceCart). El inventario NO se
 * descuenta aquí — se descuenta cuando el pago se confirma (webhook/confirm).
 */
export async function POST(req: Request) {
  if (!athEnabled()) {
    return NextResponse.json({ error: "ATH Móvil no está disponible." }, { status: 503 });
  }
  let body: { customerName?: string; email?: string; items?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const customerName = String(body.customerName || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  if (!customerName || !email) {
    return NextResponse.json({ error: "Escribe tu nombre y email primero." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const priced = await priceCart(parseIntentLines(body.items));
  if (isPricedError(priced)) {
    return NextResponse.json({ error: priced.error }, { status: 400 });
  }
  // Cash-first: ATH Móvil sirve tanto B2C como B2B (el negocio paga ahora, no
  // por factura). priceCart ya derivó kind/businessId desde la sesión y validó
  // el mínimo mayorista. El tope de $1,500 es el límite de ATH Móvil; pedidos
  // mayores se pagan con tarjeta (Stripe).
  if (priced.total < 1 || priced.total > 1500) {
    return NextResponse.json({ error: "ATH Móvil acepta pagos de $1 a $1,500." }, { status: 400 });
  }

  const order = await createOrder({
    kind: priced.kind,
    businessId: priced.businessId,
    customerName,
    email,
    items: priced.items,
    shipping: priced.shipping,
    total: priced.total,
    paymentStatus: "pendiente_pago",
    paymentMethod: "ath_movil",
  });

  return NextResponse.json({
    order: {
      id: order.id,
      total: order.total,
      shipping: order.shipping ?? 0,
      email: order.email,
      items: order.items,
    },
  });
}
