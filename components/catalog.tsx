"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { PublicProduct } from "@/lib/public-product";
import { ProductCard } from "./product-card";

export function Catalog({
  products,
  wholesale,
  initialCategory = "Todos",
}: {
  products: PublicProduct[];
  wholesale: boolean;
  initialCategory?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL es la fuente de verdad — elimina la copia prop→useState (A-16)
  const cat = searchParams.get("cat") ?? initialCategory;

  const categories = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );

  const q = searchParams.get("q") ?? "";

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) => {
      const okCat = cat === "Todos" || p.category === cat;
      const okQ =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.tags.some((t) => t.includes(query)) ||
        p.category.toLowerCase().includes(query);
      return okCat && okQ;
    });
  }, [products, cat, q]);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "Todos" && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  return (
    <div>
      {wholesale ? (
        <div
          className="card-flat px-5 py-3 mb-6 flex items-center gap-3 text-sm font-semibold"
          style={{ background: "#e7f7f3", borderColor: "var(--color-teal)" }}
        >
          ✅ Estás viendo <strong>precios mayoristas</strong>. Mínimos de compra por producto.
        </div>
      ) : (
        <div
          className="card-flat px-5 py-3 mb-6 flex flex-wrap items-center justify-between gap-3 text-sm"
          style={{ background: "#fff4ef", borderColor: "var(--color-coral)" }}
        >
          <span className="font-semibold">¿Tienes un negocio? Desbloquea precios al por mayor.</span>
          <Link href="/para-negocios" className="btn btn-primary btn-sm">
            Ver precios de negocio →
          </Link>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              className="chip"
              data-active={cat === c}
              onClick={() => setParam("cat", c)}
              aria-pressed={cat === c}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="md:ml-auto">
          <input
            className="field md:w-64"
            placeholder="Buscar producto…"
            value={q}
            onChange={(e) => setParam("q", e.target.value)}
            aria-label="Buscar producto"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center" style={{ color: "var(--color-muted)" }}>
          No encontramos productos para &ldquo;{q}&rdquo;.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} wholesale={wholesale} />
          ))}
        </div>
      )}
    </div>
  );
}
