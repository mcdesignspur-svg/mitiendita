import Link from "next/link";
import type { Metadata } from "next";
import { getOrderById, updateOrder } from "@/lib/db";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { money } from "@/lib/format";

export const metadata: Metadata = {
  title: "¡Gracias! — Oferta exclusiva",
  robots: { index: false, follow: false },
};

// Confirmación cerrada del link exclusivo: misma reconciliación con Stripe que
// `/carrito/gracias`, pero sin chrome ni links al catálogo. El único enlace
// (opcional) regresa al mismo producto, manteniendo el funnel contenido.
export default async function ExclusiveGraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ o?: string; p?: string }>;
}) {
  const { o, p } = await searchParams;
  let order = o ? await getOrderById(o) : undefined;

  if (
    order &&
    order.paymentMethod === "stripe" &&
    order.paymentStatus === "pendiente_pago" &&
    order.stripeSessionId &&
    stripeEnabled()
  ) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(order.stripeSessionId);
      if (session.payment_status === "paid") {
        order =
          (await updateOrder(order.id, { paymentStatus: "pagada", status: "procesando" })) ?? order;
      }
    } catch {
      /* ignore */
    }
  }

  const ps = order?.paymentStatus;
  const head =
    ps === "factura_pendiente"
      ? {
          icon: "🧾",
          title: "¡Pedido recibido!",
          note: "Te enviaremos la factura. Pago con términos net 15/30 por transferencia/ACH.",
          badge: { label: "Factura pendiente", bg: "#fff7e6", fg: "#a06b00" },
        }
      : ps === "pendiente_pago"
        ? {
            icon: "⏳",
            title: "Confirmando tu pago…",
            note: "En un momento verás la confirmación y te llegará un email.",
            badge: { label: "Pago en proceso", bg: "var(--color-cream-2)", fg: "var(--color-muted)" },
          }
        : {
            icon: "🎉",
            title: "¡Pedido confirmado!",
            note: "Gracias por tu compra. Ya estamos preparando tu pedido.",
            badge:
              ps === "pagada"
                ? { label: "✓ Pagado", bg: "#e7f7f3", fg: "var(--color-teal-deep)" }
                : null,
          };

  return (
    <div className="min-h-screen grid place-items-center px-5 py-16" style={{ background: "var(--color-cream)" }}>
      <div className="card p-8 md:p-12 text-center max-w-2xl w-full">
        <div className="text-6xl mb-4">{head.icon}</div>
        <h1 className="font-display text-4xl mb-2">{head.title}</h1>
        <p className="mb-6" style={{ color: "var(--color-ink-soft)" }}>
          {head.note}
        </p>

        {order ? (
          <div className="text-left card-flat p-5 mb-6">
            <div className="flex justify-between items-center text-sm mb-3" style={{ color: "var(--color-muted)" }}>
              <span>Orden <strong style={{ color: "var(--color-ink)" }}>{order.id}</strong></span>
              <span className="flex items-center gap-2">
                {head.badge && (
                  <span className="badge" style={{ background: head.badge.bg, color: head.badge.fg, borderColor: head.badge.fg }}>
                    {head.badge.label}
                  </span>
                )}
                {order.kind === "b2b" ? "Mayorista" : "Detal"}
              </span>
            </div>
            {order.items.map((it) => (
              <div key={it.productId} className="flex justify-between py-1 text-sm">
                <span>{it.qty}× {it.name}</span>
                <span className="tabular-nums">{money(it.qty * it.unitPrice)}</span>
              </div>
            ))}
            {order.shipping ? (
              <div className="flex justify-between py-1 text-sm" style={{ color: "var(--color-muted)" }}>
                <span>Envío</span>
                <span className="tabular-nums">{money(order.shipping)}</span>
              </div>
            ) : null}
            <div className="flex justify-between pt-3 mt-2 border-t font-bold" style={{ borderColor: "var(--color-line)" }}>
              <span>Total</span>
              <span className="font-display text-lg">{money(order.total)}</span>
            </div>
          </div>
        ) : (
          <p className="mb-6" style={{ color: "var(--color-muted)" }}>
            Te enviaremos los detalles por email.
          </p>
        )}

        {p && (
          <Link href={`/exclusivo/${p}`} className="btn btn-ghost">
            ← Volver al producto
          </Link>
        )}
      </div>
    </div>
  );
}
