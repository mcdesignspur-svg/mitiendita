import { NextResponse } from "next/server";
import { confirmAthPayment } from "@/lib/athmovil";

export const runtime = "nodejs";

/** El callback del botón ATH Móvil postea aquí tras un pago COMPLETED. */
export async function POST(req: Request) {
  let body: { orderId?: string; response?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const orderId = String(body.orderId || "");
  const r = body.response || {};
  const result = await confirmAthPayment({
    orderId,
    status: String(r.ecommerceStatus || r.status || ""),
    total: Number(r.total || 0),
    reference: String(r.referenceNumber || r.reference || "") || undefined,
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
