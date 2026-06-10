import type { Metadata } from "next";
import { Suspense } from "react";
import { listProducts, listCategories } from "@/lib/db";
import { getSessionBusiness } from "@/lib/auth";
import { toPublicProduct } from "@/lib/public-product";
import { Catalog } from "@/components/catalog";

export const metadata: Metadata = {
  title: "Catálogo",
  description:
    "Productos importados de alta utilidad y virales. Filtra por categoría o busca lo que necesitas.",
  openGraph: { title: "Catálogo — Mi Tiendita PR" },
};

export default async function ProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const business = await getSessionBusiness();
  const verified = business?.status === "verified";
  const products = await listProducts({ activeOnly: true });
  const categories = await listCategories();
  const initialCategory = cat && categories.includes(cat) ? cat : "Todos";
  const publicProducts = products.map((p) => toPublicProduct(p, verified));

  return (
    <div className="wrap py-12">
      <span className="eyebrow">Catálogo</span>
      <h1 className="font-display text-4xl md:text-5xl mt-2 mb-2">
        Productos virales, listos para vender.
      </h1>
      <p className="text-base mb-8 max-w-xl" style={{ color: "var(--color-ink-soft)" }}>
        {products.length} productos importados de alta utilidad. Filtra por categoría o busca lo que necesitas.
      </p>
      <Suspense fallback={<div className="py-16 text-center" style={{ color: "var(--color-muted)" }}>Cargando catálogo…</div>}>
        <Catalog products={publicProducts} wholesale={verified} initialCategory={initialCategory} />
      </Suspense>
    </div>
  );
}
