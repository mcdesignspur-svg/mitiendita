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

// ===========================================================================
// API REST de ATH Móvil (https://github.com/evertec/ATHM-Payment-Button-API)
// Flujo: /payment (crea) → cliente confirma (CONFIRM) → /authorization (captura
// = COMPLETED) → /findPayment (verifica). El auth_token (JWT) de /payment se usa
// como Bearer en /authorization y /findPayment.
// ===========================================================================
const ATHM_API = "https://payments.athmovil.com/api/business-transaction/ecommerce";

export interface AthPaymentResult {
  ecommerceId: string;
  authToken: string;
}

/** Paso 1: crea la transacción (server-driven). Devuelve ecommerceId + auth_token. */
export async function athCreatePayment(input: {
  total: number;
  subtotal?: number;
  tax?: number;
  metadata1: string;
  metadata2?: string;
  items: { name: string; description?: string; quantity: number; price: number }[];
  timeout?: number;
}): Promise<AthPaymentResult> {
  const { publicToken, phone } = athConfig();
  const res = await fetch(`${ATHM_API}/payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      env: "production",
      publicToken,
      timeout: String(input.timeout ?? 600),
      total: input.total.toFixed(2),
      tax: (input.tax ?? 0).toFixed(2),
      subtotal: (input.subtotal ?? input.total).toFixed(2),
      metadata1: input.metadata1.slice(0, 40),
      metadata2: (input.metadata2 ?? "").slice(0, 40),
      items: input.items.map((it) => ({
        name: it.name.slice(0, 60),
        description: it.description ?? "",
        quantity: String(it.quantity),
        price: it.price.toFixed(2),
        tax: null,
        metadata: null,
      })),
      phoneNumber: phone,
    }),
  });
  const json = await res.json();
  if (json?.status !== "success") {
    throw new Error(json?.errorMessage || "ATH /payment falló");
  }
  return { ecommerceId: json.data.ecommerceId, authToken: json.data.auth_token };
}

type AthTxn = {
  ecommerceStatus?: "OPEN" | "CONFIRM" | "COMPLETED" | "CANCEL";
  ecommerceId?: string;
  referenceNumber?: string;
  total?: number;
};

/** Verifica el estado real de la transacción con ATH (fuente de verdad). */
export async function athFindPayment(ecommerceId: string, authToken: string): Promise<AthTxn> {
  const { publicToken } = athConfig();
  const res = await fetch(`${ATHM_API}/business/findPayment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ ecommerceId, publicToken }),
  });
  const json = await res.json();
  return (json?.data ?? {}) as AthTxn;
}

/** Paso 3: captura/completa la transacción (server-side). Requiere el auth_token. */
export async function athAuthorize(authToken: string): Promise<AthTxn> {
  const res = await fetch(`${ATHM_API}/authorization`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${authToken}`,
    },
  });
  const json = await res.json();
  if (json?.status !== "success") {
    throw new Error(json?.errorMessage || "ATH /authorization falló");
  }
  return json.data as AthTxn;
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
