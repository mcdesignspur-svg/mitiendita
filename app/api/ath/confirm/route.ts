import { NextResponse } from "next/server";
import { confirmAthPayment } from "@/lib/athmovil";

export const runtime = "nodejs";

/**
 * Callback del botón ATH Móvil tras un pago COMPLETED (respaldo de UX del
 * webhook). CR-2: NO confiamos en el `response` del cliente — solo tomamos el
 * `ecommerceId` como identificador y dejamos que `confirmAthPayment` verifique
 * el estado y el monto reales contra ATH (findPayment). El webhook es la fuente
 * de verdad; esto solo acelera la confirmación en pantalla.
 */
export async function POST(req: Request) {
  let body: { orderId?: string; response?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const orderId = String(body.orderId || "");
  const r = body.response || {};
  const ecommerceId =
    String(r.ecommerceId || (r as Record<string, unknown>).ecommerceID || "") || undefined;
  const result = await confirmAthPayment({ orderId, ecommerceId });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
