"use client";

import { useActionState, useState } from "react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/format";
import { effectiveRetail, hasDiscount, shippingOf } from "@/lib/products";
import { checkoutAction, type FormState } from "@/lib/actions";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Compra contenida para un link cerrado: muestra precio + cantidad de UN solo
 * producto y hace el checkout aquí mismo (nombre + email), sin pasar por el
 * carrito ni mandar al cliente al catálogo. Postea directo a `checkoutAction`
 * con `origin=exclusivo` para que la confirmación también sea cerrada.
 *
 * No usa el carrito del sitio (localStorage): arma su propia línea de pedido,
 * así el funnel queda 100% aislado a este producto.
 */
export function ExclusiveBuy({
  product,
  wholesale,
  businessId,
}: {
  product: Product;
  wholesale: boolean;
  businessId?: string;
}) {
  const min = wholesale ? product.moq : 1;
  const step = wholesale ? product.moq : 1;
  const [qty, setQty] = useState(min);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    checkoutAction,
    {},
  );

  const retail = effectiveRetail(product);
  const unitPrice = wholesale ? product.wholesale : retail;
  const showDiscount = !wholesale && hasDiscount(product);
  const shipping = shippingOf(product);
  const total = qty * unitPrice + shipping;
  const contactReady = customerName.trim().length > 1 && EMAIL_RE.test(email);

  const items = [
    { productId: product.id, name: product.name, qty, unitPrice },
  ];

  return (
    <div className="card p-6">
      {wholesale ? (
        <>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl" style={{ color: "var(--color-teal-deep)" }}>
              {money(product.wholesale)}
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
              / unidad · mayorista
            </span>
          </div>
          <div
            className="mt-3 text-xs font-semibold inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "#e7f7f3", color: "var(--color-teal-deep)" }}
          >
            📦 Mínimo {product.moq} uds · caja máster {product.unitsPerCase} uds
          </div>
        </>
      ) : (
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-display text-4xl">{money(retail)}</span>
          {showDiscount && (
            <>
              <span className="text-base line-through" style={{ color: "var(--color-muted)" }}>
                {money(product.retail)}
              </span>
              <span className="badge" style={{ background: "var(--color-grape)", color: "#fff" }}>
                −{product.discountPercent}% OFF
              </span>
            </>
          )}
        </div>
      )}

      <p className="text-sm mt-4" style={{ color: "var(--color-ink-soft)" }}>
        🚚 Envío: <strong>{shipping > 0 ? money(shipping) : "Gratis"}</strong>
      </p>

      {/* cantidad */}
      <div className="flex items-center gap-3 mt-4">
        <div className="flex items-center rounded-full overflow-hidden" style={{ border: "2px solid var(--color-ink)" }}>
          <button
            type="button"
            className="px-4 py-2 font-bold text-lg"
            onClick={() => setQty((q) => Math.max(min, q - step))}
            aria-label="Menos"
          >
            −
          </button>
          <span className="px-4 font-bold tabular-nums min-w-[3ch] text-center">{qty}</span>
          <button
            type="button"
            className="px-4 py-2 font-bold text-lg"
            onClick={() => setQty((q) => q + step)}
            aria-label="Más"
          >
            +
          </button>
        </div>
        <span className="text-sm font-semibold" style={{ color: "var(--color-ink-soft)" }}>
          Total {money(total)}
        </span>
      </div>

      {/* datos + checkout contenido */}
      <form action={formAction} className="mt-5">
        <label className="label" htmlFor="customerName">Nombre</label>
        <input
          id="customerName"
          name="customerName"
          className="field mb-3"
          placeholder="Tu nombre"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="field mb-4"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input type="hidden" name="items" value={JSON.stringify(items)} />
        <input type="hidden" name="kind" value={wholesale ? "b2b" : "b2c"} />
        <input type="hidden" name="shipping" value={shipping} />
        <input type="hidden" name="method" value="stripe" />
        <input type="hidden" name="origin" value="exclusivo" />
        <input type="hidden" name="slug" value={product.slug} />
        {businessId && <input type="hidden" name="businessId" value={businessId} />}

        {state.error && (
          <p className="text-sm mb-3 font-semibold" style={{ color: "var(--color-coral-deep)" }}>
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending || !contactReady}
          className="btn btn-primary w-full"
        >
          {pending
            ? "Procesando…"
            : wholesale
              ? "Confirmar pedido (factura) →"
              : "Comprar ahora →"}
        </button>
      </form>

      <p className="text-xs mt-3 text-center" style={{ color: "var(--color-muted)" }}>
        {wholesale
          ? "Pedido mayorista: te enviamos la factura con términos (net 15/30)."
          : "Pago seguro con Stripe. Aceptamos tarjeta, Apple Pay y Google Pay."}
      </p>
    </div>
  );
}
