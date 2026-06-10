import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getOrderById, updateOrder } from "@/lib/db";
import { notifyOrderConfirmation } from "@/lib/notify";
import { applyOrderInventory } from "@/lib/inventory";
import { toCents } from "@/lib/money";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook no configurado." }, { status: 503 });
  }
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Falta la firma." }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "Firma inválida." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId && session.payment_status === "paid") {
      const order = await getOrderById(orderId);
      if (order) {
        // M-8: el monto cobrado por Stripe debe coincidir con el total recalculado
        // de la orden. Si difiere (manipulación o desincronización), no marcamos
        // pagada ni descontamos inventario; dejamos rastro para revisión.
        const expected = toCents(order.total);
        const paid = session.amount_total ?? 0;
        if (paid !== expected) {
          console.error(
            `[stripe] monto no coincide para orden ${orderId}: cobrado ${paid}¢ vs esperado ${expected}¢`,
          );
        } else if (order.paymentStatus !== "pagada") {
          // CR-3/A-8: el inventario se descuenta SOLO al confirmarse el pago.
          // El guard `!== "pagada"` lo hace idempotente ante webhooks repetidos.
          const updated = await updateOrder(orderId, {
            paymentStatus: "pagada",
            status: "procesando",
          });
          if (updated) {
            await applyOrderInventory(updated).catch(() => {});
            await notifyOrderConfirmation(updated).catch(() => {});
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
