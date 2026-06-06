"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/format";
import { effectiveRetail, hasDiscount, shippingOf } from "@/lib/products";
import { useCart } from "./cart-context";

export function ProductDetailBuy({
  product,
  wholesale,
}: {
  product: Product;
  wholesale: boolean;
}) {
  const { add } = useCart();
  const min = wholesale ? product.moq : 1;
  const step = wholesale ? product.moq : 1;
  const [qty, setQty] = useState(min);
  const [added, setAdded] = useState(false);
  const retail = effectiveRetail(product);
  const unitPrice = wholesale ? product.wholesale : retail;
  const showDiscount = !wholesale && hasDiscount(product);
  const shipping = shippingOf(product);

  function handleAdd() {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        emoji: product.emoji,
        unitPrice,
        shippingPrice: shipping,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

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
          <p className="text-sm mt-1 line-through" style={{ color: "var(--color-muted)" }}>
            Detal {money(product.retail)}
          </p>
          <div
            className="mt-3 text-xs font-semibold inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "#e7f7f3", color: "var(--color-teal-deep)" }}
          >
            📦 Mínimo {product.moq} uds · caja máster {product.unitsPerCase} uds
          </div>
        </>
      ) : (
        <>
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
          <Link
            href="/para-negocios"
            className="mt-3 block text-sm font-semibold rounded-xl px-4 py-3"
            style={{ background: "#fff4ef", color: "var(--color-coral-deep)", border: "1.5px solid var(--color-coral)" }}
          >
            🏪 ¿Negocio? El precio mayorista de este producto se desbloquea con tu cuenta verificada. →
          </Link>
        </>
      )}

      <p className="text-sm mt-4" style={{ color: "var(--color-ink-soft)" }}>
        🚚 Envío: <strong>{shipping > 0 ? money(shipping) : "Gratis"}</strong>
      </p>

      {/* qty stepper */}
      <div className="flex items-center gap-3 mt-4">
        <div className="flex items-center rounded-full overflow-hidden" style={{ border: "2px solid var(--color-ink)" }}>
          <button
            className="px-4 py-2 font-bold text-lg"
            onClick={() => setQty((q) => Math.max(min, q - step))}
            aria-label="Menos"
          >
            −
          </button>
          <span className="px-4 font-bold tabular-nums min-w-[3ch] text-center">{qty}</span>
          <button
            className="px-4 py-2 font-bold text-lg"
            onClick={() => setQty((q) => q + step)}
            aria-label="Más"
          >
            +
          </button>
        </div>
        <span className="text-sm font-semibold" style={{ color: "var(--color-ink-soft)" }}>
          Total {money(qty * unitPrice)}
        </span>
      </div>

      <button onClick={handleAdd} className="btn btn-primary w-full mt-5">
        {added ? "✓ Agregado al carrito" : "Agregar al carrito"}
      </button>
      <Link href="/carrito" className="btn btn-ghost w-full mt-2">
        Ir al carrito
      </Link>
    </div>
  );
}
