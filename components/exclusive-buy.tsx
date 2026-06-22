"use client";

import { useActionState, useState } from "react";
import type { PublicProduct } from "@/lib/public-product";
import { effectiveRetailPublic, hasDiscountPublic } from "@/lib/public-product";
import { money } from "@/lib/format";
import { checkoutAction, type FormState } from "@/lib/actions";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Compra contenida para un link cerrado: precio + cantidad de UN solo producto
 * y checkout aquí mismo (nombre + email), sin pasar por el carrito ni mandar al
 * cliente al catálogo. Postea solo la intención `[{productId, qty}]` — el server
 * re-precia (lib/pricing) — con `origin=exclusivo` para que la confirmación
 * también sea cerrada.
 */
export function ExclusiveBuy({
  product,
  wholesale,
}: {
  product: PublicProduct;
  wholesale: boolean;
}) {
  const isWholesale = wholesale && product.wholesale != null;
  const maxQty = product.stock > 0 ? product.stock : 0;
  const isOutOfStock = product.stock === 0;
  const [qty, setQty] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    checkoutAction,
    {},
  );

  const retail = effectiveRetailPublic(product);
  const unitPrice = isWholesale ? product.wholesale! : retail;
  const showDiscount = !wholesale && hasDiscountPublic(product);
  const shipping = product.shippingPrice ?? 0;
  const clampedQty = maxQty > 0 ? Math.min(qty, maxQty) : 1;
  const total = clampedQty * unitPrice + shipping;
  const contactReady = customerName.trim().length > 1 && EMAIL_RE.test(email);

  const items = [{ productId: product.id, qty: clampedQty }];

  return (
    <div className="card p-6">
      {isWholesale ? (
        <>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl" style={{ color: "var(--color-teal-deep)" }}>
              {money(product.wholesale!)}
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
              / unidad · mayorista
            </span>
          </div>
          <p className="text-sm mt-1 line-through" style={{ color: "var(--color-muted)" }}>
            Detal {money(product.retail)}
          </p>
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

      {isOutOfStock ? (
        <div
          className="mt-4 px-4 py-3 rounded-xl text-sm font-semibold text-center"
          style={{ background: "var(--color-cream-2)", color: "var(--color-ink-soft)", border: "1.5px solid var(--color-line)" }}
        >
          Bajo pedido — contáctanos para disponibilidad
        </div>
      ) : (
        <>
          {/* cantidad */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center rounded-full overflow-hidden" style={{ border: "2px solid var(--color-ink)" }}>
              <button
                type="button"
                className="px-4 py-2 font-bold text-lg"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Reducir cantidad"
                disabled={clampedQty <= 1}
              >
                −
              </button>
              <span className="px-4 font-bold tabular-nums min-w-[3ch] text-center">{clampedQty}</span>
              <button
                type="button"
                className="px-4 py-2 font-bold text-lg"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                aria-label="Aumentar cantidad"
                disabled={maxQty > 0 && clampedQty >= maxQty}
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
            <input type="hidden" name="origin" value="exclusivo" />
            <input type="hidden" name="slug" value={product.slug} />

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
              {pending ? "Procesando…" : "Comprar ahora →"}
            </button>
          </form>

          <p className="text-xs mt-3 text-center" style={{ color: "var(--color-muted)" }}>
            Pago seguro con Stripe. Aceptamos tarjeta, Apple Pay y Google Pay.
          </p>
        </>
      )}
    </div>
  );
}
