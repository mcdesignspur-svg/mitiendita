"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/format";
import { effectiveRetail, hasDiscount, shippingOf } from "@/lib/products";
import { useCart } from "./cart-context";

export function ProductCard({
  product,
  wholesale,
}: {
  product: Product;
  wholesale: boolean;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const retail = effectiveRetail(product);
  const unitPrice = wholesale ? product.wholesale : retail;
  const qty = wholesale ? product.moq : 1;
  const showDiscount = !wholesale && hasDiscount(product);

  function handleAdd() {
    add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        emoji: product.emoji,
        unitPrice,
        shippingPrice: shippingOf(product),
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1300);
  }

  return (
    <div className="card overflow-hidden flex flex-col group">
      <Link href={`/productos/${product.slug}`} className="block">
        <div
          className="relative aspect-[4/3] grid place-items-center text-6xl"
          style={{ background: product.gradient }}
        >
          <span className="drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
            {product.emoji}
          </span>
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {product.badges.map((b) => (
              <span key={b} className={`badge badge-${b}`}>
                {b === "viral" ? "🔥 Viral" : b === "nuevo" ? "Nuevo" : "★ Top"}
              </span>
            ))}
          </div>
          {showDiscount && (
            <span
              className="absolute top-3 right-3 badge"
              style={{ background: "var(--color-grape)", color: "#fff" }}
            >
              −{product.discountPercent}%
            </span>
          )}
        </div>
      </Link>

      <div className="p-4 flex flex-col flex-1">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--color-teal-deep)" }}>
          {product.category}
        </span>
        <Link href={`/productos/${product.slug}`}>
          <h3 className="font-display text-lg leading-tight mt-1 mb-1 hover:underline">
            {product.name}
          </h3>
        </Link>
        <p className="text-sm flex-1" style={{ color: "var(--color-ink-soft)" }}>
          {product.tagline}
        </p>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            {wholesale ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl" style={{ color: "var(--color-teal-deep)" }}>
                    {money(product.wholesale)}
                  </span>
                  <span className="text-xs line-through" style={{ color: "var(--color-muted)" }}>
                    {money(product.retail)}
                  </span>
                </div>
                <span className="text-[11px] font-semibold" style={{ color: "var(--color-muted)" }}>
                  Mayorista · mín. {product.moq} uds
                </span>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-2xl">{money(retail)}</span>
                  {showDiscount && (
                    <span className="text-xs line-through" style={{ color: "var(--color-muted)" }}>
                      {money(product.retail)}
                    </span>
                  )}
                </div>
                <span className="block text-[11px] font-semibold" style={{ color: "var(--color-teal-deep)" }}>
                  Precio de negocio disponible
                </span>
              </>
            )}
          </div>

          <button
            onClick={handleAdd}
            className="btn btn-primary btn-sm shrink-0"
            aria-label={`Agregar ${product.name}`}
          >
            {added ? "✓ Listo" : wholesale ? "+ Caja" : "+ Añadir"}
          </button>
        </div>
      </div>
    </div>
  );
}
