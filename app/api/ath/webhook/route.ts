import { NextResponse } from "next/server";
import { confirmAthPayment } from "@/lib/athmovil";

export const runtime = "nodejs";

/**
 * Webhook de ATH Móvil (ecommercePaymentReceivedEvent). Fuente de verdad del
 * pago: hace match por metadata1 (orderId) y verifica el monto. Siempre 200
 * para evitar reintentos infinitos.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ received: true });
  }

  const p = body?.payment || body?.data || body || {};
  const orderId = String(p.metadata1 ?? body?.metadata1 ?? "");
  const status = String(p.ecommerceStatus ?? p.status ?? "COMPLETED");
  const total = Number(p.total ?? body?.total ?? 0);
  const reference = String(p.referenceNumber ?? p.reference ?? "") || undefined;

  if (orderId) {
    await confirmAthPayment({ orderId, status, total, reference }).catch(() => {});
  }
  return NextResponse.json({ received: true });
}
