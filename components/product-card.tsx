"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import type { PublicProduct } from "@/lib/public-product";
import { effectiveRetailPublic, hasDiscountPublic } from "@/lib/public-product";
import { money } from "@/lib/format";
import { safeImageUrl } from "@/lib/url-safe";
import { useCart } from "./cart-context";
import { CardName } from "./card-name";

export function ProductCard({
  product,
  wholesale,
}: {
  product: PublicProduct;
  wholesale: boolean;
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const retail = effectiveRetailPublic(product);
  const showDiscount = !wholesale && hasDiscountPublic(product);
  const imgSrc = safeImageUrl(product.imageUrl);

  // Fix: "+ Caja" añade unitsPerCase (no moq — bug B12 corregido)
  function handleAdd() {
    const qty = wholesale ? (product.unitsPerCase ?? 1) : 1;
    add(product.id, qty);
    setAdded(true);
  }

  // Cleanup del setTimeout al desmontar (evita setState en componente desmontado)
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1300);
    return () => clearTimeout(t);
  }, [added]);

  const isOutOfStock = product.stock === 0;

  return (
    <div className="card overflow-hidden flex flex-col group">
      <Link href={`/productos/${product.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden" style={{ background: product.gradient }}>
          {imgSrc ? (
            <Image
              src={imgSrc}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-6xl drop-shadow-lg transition-transform duration-300 group-hover:scale-110">
              {product.emoji}
            </span>
          )}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
            {product.badges.map((b) => (
              <span key={b} className={`badge badge-${b}`}>
                {b === "viral" ? "🔥 Viral" : b === "nuevo" ? "Nuevo" : "★ Top"}
              </span>
            ))}
          </div>
          {showDiscount && (
            <span
              className="absolute top-3 right-3 z-10 badge"
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
        <CardName name={product.name} slug={product.slug} />
        <p className="text-sm flex-1" style={{ color: "var(--color-ink-soft)" }}>
          {product.tagline}
        </p>

        <div className="mt-4 flex items-end justify-between gap-2">
          <div>
            {wholesale && product.wholesale != null ? (
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
                  Precio mayorista por unidad
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

          {isOutOfStock ? (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: "var(--color-cream-2)", color: "var(--color-muted)", border: "1.5px solid var(--color-line)" }}>
              Bajo pedido
            </span>
          ) : (
            <button
              onClick={handleAdd}
              className="btn btn-primary btn-sm shrink-0"
              aria-label={`Agregar ${product.name} al carrito`}
            >
              {added ? "✓ Listo" : wholesale ? "+ Caja" : "+ Añadir"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
