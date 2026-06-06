import { getOrderById, updateOrder } from "./db";
import { notifyOrderConfirmation } from "./notify";

/**
 * Integración ATH Móvil (Evertec).
 * - El botón vive en el cliente (components/ath-button.tsx) con el public token.
 * - La confirmación de pago la marca el webhook (fuente de verdad) y, como
 *   respaldo de UX, la ruta /api/ath/confirm tras el callback del botón.
 * Sin tokens, ATH Móvil simplemente no se ofrece (degradación elegante).
 */

export function athEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ATHM_PUBLIC_TOKEN && process.env.NEXT_PUBLIC_ATHM_PHONE);
}

export function athConfig() {
  return {
    publicToken: process.env.NEXT_PUBLIC_ATHM_PUBLIC_TOKEN || "",
    phone: process.env.NEXT_PUBLIC_ATHM_PHONE || "",
    privateToken: process.env.ATHM_PRIVATE_TOKEN || "",
  };
}

/**
 * Valida y marca pagada una orden de ATH Móvil. Idempotente.
 * Verifica que el pago esté COMPLETED y que el monto coincida con la orden.
 */
export async function confirmAthPayment(opts: {
  orderId: string;
  status: string;
  total: number;
  reference?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const order = await getOrderById(opts.orderId);
  if (!order) return { ok: false, reason: "orden no encontrada" };
  if (order.paymentStatus === "pagada") return { ok: true };
  if (opts.status.toUpperCase() !== "COMPLETED") return { ok: false, reason: "pago no completado" };
  if (Math.abs((opts.total || 0) - order.total) > 0.01) return { ok: false, reason: "monto no coincide" };

  const updated = await updateOrder(order.id, {
    paymentStatus: "pagada",
    status: "procesando",
    paymentRef: opts.reference,
  });
  if (updated) await notifyOrderConfirmation(updated).catch(() => {});
  return { ok: true };
}

/** Suscribe (una sola vez) la URL del webhook con ATH Móvil. */
export async function subscribeAthWebhook(listenerURL: string) {
  const { publicToken, privateToken } = athConfig();
  if (!publicToken || !privateToken) {
    throw new Error("Faltan NEXT_PUBLIC_ATHM_PUBLIC_TOKEN o ATHM_PRIVATE_TOKEN.");
  }
  const res = await fetch("https://www.athmovil.com/transactions/webhook/post", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      publicToken,
      privateToken,
      listenerURL,
      paymentReceivedEvent: true,
      refundSentEvent: true,
      ecommercePaymentReceivedEvent: true,
      ecommercePaymentCancelledEvent: true,
      ecommercePaymentExpiredEvent: true,
    }),
  });
  return { status: res.status, body: await res.text() };
}
