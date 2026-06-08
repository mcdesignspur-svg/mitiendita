import Link from "next/link";
import type { Product } from "@/lib/types";
import { ProductCard } from "./product-card";

export function HomeFeatured({
  products,
  wholesale,
}: {
  products: Product[];
  wholesale: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <section className="wrap py-8">
      <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
        <div>
          <span className="eyebrow">Lo más viral</span>
          <h2 className="font-display text-3xl md:text-4xl mt-2">Top de la semana 🔥</h2>
        </div>
        <Link href="/productos" className="btn btn-ghost btn-sm">
          Ver todo el catálogo →
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} wholesale={wholesale} />
        ))}
      </div>
    </section>
  );
}
