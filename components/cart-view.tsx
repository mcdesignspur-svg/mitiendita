"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useCart } from "./cart-context";
import { money } from "@/lib/format";
import { checkoutAction, type FormState } from "@/lib/actions";

export function CartView({
  kind,
  businessId,
  businessName,
}: {
  kind: "b2c" | "b2b";
  businessId?: string;
  businessName?: string;
}) {
  const { lines, subtotal, setQty, remove } = useCart();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    checkoutAction,
    {},
  );

  const items = lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    qty: l.qty,
    unitPrice: l.unitPrice,
  }));
  // Envío del pedido = el más alto entre los productos del carrito.
  const shipping = lines.reduce((m, l) => Math.max(m, l.shippingPrice || 0), 0);
  const total = subtotal + shipping;

  if (lines.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h2 className="font-display text-2xl mb-2">Tu carrito está vacío</h2>
        <p className="mb-6" style={{ color: "var(--color-ink-soft)" }}>
          Explora el catálogo y agrega lo más viral.
        </p>
        <Link href="/productos" className="btn btn-primary">
          Ver catálogo →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
      {/* lines */}
      <div className="space-y-3">
        {lines.map((l) => (
          <div key={l.productId} className="card p-4 flex items-center gap-4">
            <Link
              href={`/productos/${l.slug}`}
              className="grid place-items-center w-16 h-16 rounded-xl text-3xl shrink-0"
              style={{ background: "var(--color-cream-2)", border: "1.5px solid var(--color-line)" }}
            >
              {l.emoji}
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/productos/${l.slug}`} className="font-semibold hover:underline block truncate">
                {l.name}
              </Link>
              <span className="text-sm" style={{ color: "var(--color-muted)" }}>
                {money(l.unitPrice)} c/u
              </span>
            </div>
            <div className="flex items-center rounded-full overflow-hidden shrink-0" style={{ border: "2px solid var(--color-ink)" }}>
              <button className="px-3 py-1.5 font-bold" onClick={() => setQty(l.productId, l.qty - 1)}>−</button>
              <span className="px-3 font-bold tabular-nums">{l.qty}</span>
              <button className="px-3 py-1.5 font-bold" onClick={() => setQty(l.productId, l.qty + 1)}>+</button>
            </div>
            <span className="font-display text-lg w-20 text-right tabular-nums shrink-0">
              {money(l.qty * l.unitPrice)}
            </span>
            <button onClick={() => remove(l.productId)} className="text-xl shrink-0" aria-label="Eliminar" style={{ color: "var(--color-muted)" }}>
              ✕
            </button>
          </div>
        ))}
      </div>

      {/* checkout */}
      <form action={formAction} className="card p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-2xl mb-1">Resumen</h2>
        {kind === "b2b" && (
          <p className="text-xs font-semibold mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: "#e7f7f3", color: "var(--color-teal-deep)" }}>
            ✅ Pedido mayorista · {businessName}
          </p>
        )}
        <div className="flex justify-between py-3 border-b" style={{ borderColor: "var(--color-line)" }}>
          <span style={{ color: "var(--color-ink-soft)" }}>Subtotal</span>
          <span className="font-bold tabular-nums">{money(subtotal)}</span>
        </div>
        <div className="flex justify-between py-3 border-b" style={{ borderColor: "var(--color-line)" }}>
          <span style={{ color: "var(--color-ink-soft)" }}>Envío</span>
          <span className="font-bold tabular-nums">{shipping > 0 ? money(shipping) : "Gratis"}</span>
        </div>
        <div className="flex justify-between py-3 mb-4 text-lg">
          <span className="font-bold">Total</span>
          <span className="font-display text-2xl tabular-nums">{money(total)}</span>
        </div>

        <input type="hidden" name="items" value={JSON.stringify(items)} />
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="shipping" value={shipping} />
        {businessId && <input type="hidden" name="businessId" value={businessId} />}

        <label className="label" htmlFor="customerName">Nombre</label>
        <input id="customerName" name="customerName" className="field mb-3" placeholder="Tu nombre" required />
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" className="field mb-4" placeholder="tu@email.com" required />

        {state.error && (
          <p className="text-sm mb-3 font-semibold" style={{ color: "var(--color-coral-deep)" }}>
            {state.error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "Procesando…" : "Confirmar pedido →"}
        </button>
        <p className="text-xs mt-3 text-center" style={{ color: "var(--color-muted)" }}>
          Demo: el pedido se registra en el panel de operación. El pago se integra en producción.
        </p>
      </form>
    </div>
  );
}
