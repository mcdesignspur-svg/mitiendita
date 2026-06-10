import { NextResponse } from "next/server";
import { confirmAthPayment } from "@/lib/athmovil";

export const runtime = "nodejs";

/**
 * Webhook de ATH Móvil (ecommercePaymentReceivedEvent).
 *
 * CR-2: NO confiamos en el `status`/`total` del body. Del webhook solo tomamos
 * los identificadores (orderId vía metadata1 y ecommerceId) y delegamos a
 * `confirmAthPayment`, que re-consulta a ATH (findPayment) y marca pagada SOLO
 * si ATH dice COMPLETED y el monto coincide con order.total. Siempre 200 para
 * evitar reintentos infinitos de ATH.
 */
export async function POST(req: Request) {
  // El body del webhook es JSON arbitrario de ATH; solo extraemos identificadores.
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ received: true });
  }

  const p = body?.payment || body?.data || body || {};
  const orderId = String(p.metadata1 ?? body?.metadata1 ?? "");
  const ecommerceId =
    String(p.ecommerceId ?? body?.ecommerceId ?? p.ecommerceID ?? "") || undefined;

  if (orderId) {
    await confirmAthPayment({ orderId, ecommerceId }).catch(() => {});
  }
  return NextResponse.json({ received: true });
}
