/**
 * Canal de notificaciones (email vía Resend) con degradación elegante.
 *
 * Si existe RESEND_API_KEY, envía por la API REST de Resend (sin SDK extra).
 * Si no, registra en consola y no falla — la app funciona igual sin la key.
 * WhatsApp se enchufará detrás de esta misma interfaz más adelante.
 */
import type { Order, Business } from "./types";
import { money } from "./format";

const FROM = process.env.EMAIL_FROM || "Mi Tiendita PR <onboarding@resend.dev>";

export function emailEnabled(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export interface SendResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<SendResult> {
  if (!emailEnabled()) {
    console.log(`[notify] (sin RESEND_API_KEY) email NO enviado → ${opts.to}: "${opts.subject}"`);
    return { sent: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html ?? textToHtml(opts.text),
        reply_to: opts.replyTo,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error(`[notify] Resend error ${res.status}: ${detail}`);
      return { sent: false, error: `${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    console.error("[notify] fallo enviando email:", e);
    return { sent: false, error: String(e) };
  }
}

function textToHtml(text: string): string {
  const body = text
    .split("\n\n")
    .map((p) => `<p style="margin:0 0 14px">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5;color:#1c1813;max-width:560px">${body}</div>`;
}

// --- Notificaciones de la operación ----------------------------

export async function notifyOrderConfirmation(order: Order): Promise<SendResult> {
  const items = order.items.map((i) => `• ${i.qty}× ${i.name} — ${money(i.unitPrice * i.qty)}`).join("\n");
  const text = `¡Gracias por tu pedido en Mi Tiendita PR! 🇵🇷

Pedido ${order.id}
${items}
${order.shipping ? `Envío: ${money(order.shipping)}\n` : ""}Total: ${money(order.total)}

Te escribimos cuando salga tu pedido. ¡Gracias por comprar local!`;
  return sendEmail({ to: order.email, subject: `Tu pedido ${order.id} — Mi Tiendita PR`, text });
}

export async function notifyBusinessApproved(b: Business): Promise<SendResult> {
  const text = `¡Felicidades, ${b.contactName}! 🎉

La cuenta de ${b.businessName} fue verificada en Mi Tiendita PR. Ya tienes los precios mayoristas desbloqueados en todo el catálogo.

Entra a tu cuenta y haz tu primer pedido al por mayor cuando quieras.`;
  return sendEmail({ to: b.email, subject: "Tu cuenta de negocio fue verificada — Mi Tiendita PR", text });
}
