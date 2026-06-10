"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import type { PublicProduct } from "@/lib/public-product";
import { effectiveRetailPublic, hasDiscountPublic } from "@/lib/public-product";
import { money } from "@/lib/format";
import { useCart } from "./cart-context";

export function ProductDetailBuy({
  product,
  wholesale,
}: {
  product: PublicProduct;
  wholesale: boolean;
}) {
  const { add } = useCart();
  const isWholesale = wholesale && product.wholesale != null;
  // Sin mínimo por SKU: el negocio compra desde 1 unidad a precio mayorista.
  // El mínimo de pedido mayorista es por carrito completo (se valida allá).
  const min = 1;
  const step = 1;
  const maxQty = product.stock > 0 ? product.stock : 0;
  const [qty, setQty] = useState(min);
  const [added, setAdded] = useState(false);
  const retail = effectiveRetailPublic(product);
  const unitPrice = isWholesale ? product.wholesale! : retail;
  const showDiscount = !wholesale && hasDiscountPublic(product);
  const shipping = product.shippingPrice ?? 0;
  const isOutOfStock = product.stock === 0;

  // Clamp qty a stock disponible
  const clampedQty = maxQty > 0 ? Math.min(qty, maxQty) : min;

  // Cleanup del timeout para evitar setState en componente desmontado
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(t);
  }, [added]);

  function handleAdd() {
    if (isOutOfStock) return;
    add(product.id, clampedQty);
    setAdded(true);
  }

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
          <div
            className="mt-3 text-xs font-semibold inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "#e7f7f3", color: "var(--color-teal-deep)" }}
          >
            📦 Precio mayorista por unidad · caja máster {product.unitsPerCase} uds
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

      {isOutOfStock ? (
        <div
          className="mt-4 px-4 py-3 rounded-xl text-sm font-semibold text-center"
          style={{ background: "var(--color-cream-2)", color: "var(--color-ink-soft)", border: "1.5px solid var(--color-line)" }}
        >
          Bajo pedido — contáctanos para disponibilidad
        </div>
      ) : (
        <>
          {/* qty stepper */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center rounded-full overflow-hidden" style={{ border: "2px solid var(--color-ink)" }}>
              <button
                className="px-4 py-2 font-bold text-lg"
                onClick={() => setQty((q) => Math.max(min, q - step))}
                aria-label="Reducir cantidad"
                disabled={clampedQty <= min}
              >
                −
              </button>
              <span className="px-4 font-bold tabular-nums min-w-[3ch] text-center">{clampedQty}</span>
              <button
                className="px-4 py-2 font-bold text-lg"
                onClick={() => setQty((q) => Math.min(maxQty, q + step))}
                aria-label="Aumentar cantidad"
                disabled={maxQty > 0 && clampedQty >= maxQty}
              >
                +
              </button>
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--color-ink-soft)" }}>
              Total {money(clampedQty * unitPrice)}
            </span>
          </div>

          <button
            onClick={handleAdd}
            className="btn btn-primary w-full mt-5"
            disabled={isOutOfStock}
          >
            {added ? "✓ Agregado al carrito" : "Agregar al carrito"}
          </button>
        </>
      )}

      <Link href="/carrito" className="btn btn-ghost w-full mt-2">
        Ir al carrito
      </Link>
    </div>
  );
}
