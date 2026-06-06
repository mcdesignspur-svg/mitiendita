import { NextResponse } from "next/server";
import { createOrder } from "@/lib/db";
import { athEnabled } from "@/lib/athmovil";
import type { OrderItem } from "@/lib/types";

export const runtime = "nodejs";

/** Crea la orden ATH Móvil (pendiente) para renderizar el botón en el carrito. */
export async function POST(req: Request) {
  if (!athEnabled()) {
    return NextResponse.json({ error: "ATH Móvil no está disponible." }, { status: 503 });
  }
  let body: { customerName?: string; email?: string; items?: OrderItem[]; shipping?: number };
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
  const items: OrderItem[] = Array.isArray(body.items) ? body.items : [];
  if (!items.length) {
    return NextResponse.json({ error: "Tu carrito está vacío." }, { status: 400 });
  }
  const shipping = Math.max(0, Number(body.shipping) || 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const total = subtotal + shipping;
  if (total < 1 || total > 1500) {
    return NextResponse.json({ error: "ATH Móvil acepta pagos de $1 a $1,500." }, { status: 400 });
  }

  const order = await createOrder({
    kind: "b2c",
    customerName,
    email,
    items,
    shipping,
    total,
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
