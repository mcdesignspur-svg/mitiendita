import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { updateOrder } from "@/lib/db";
import { notifyOrderConfirmation } from "@/lib/notify";

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
      const updated = await updateOrder(orderId, {
        paymentStatus: "pagada",
        status: "procesando",
      });
      if (updated) await notifyOrderConfirmation(updated).catch(() => {});
    }
  }

  return NextResponse.json({ received: true });
}
