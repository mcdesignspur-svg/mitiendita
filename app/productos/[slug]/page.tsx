import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, relatedProducts } from "@/lib/db";
import { getSessionBusiness } from "@/lib/auth";
import { ProductDetailBuy } from "@/components/product-detail-buy";
import { ProductCard } from "@/components/product-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: product ? `${product.name} — Mi Tiendita PR` : "Producto — Mi Tiendita PR",
    description: product?.tagline,
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.active === false) notFound();

  const business = await getSessionBusiness();
  const wholesale = business?.status === "verified";
  const related = await relatedProducts(slug, 3);

  return (
    <div className="wrap py-10">
      <nav className="text-sm mb-6" style={{ color: "var(--color-muted)" }}>
        <Link href="/" className="hover:underline">Inicio</Link>
        {" / "}
        <Link href="/productos" className="hover:underline">Catálogo</Link>
        {" / "}
        <span style={{ color: "var(--color-ink)" }}>{product.name}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* visual */}
        <div>
          <div
            className="card aspect-square grid place-items-center text-[10rem] overflow-hidden"
            style={{ background: product.gradient }}
          >
            <span className="drop-shadow-xl">{product.emoji}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {product.badges.map((b) => (
              <span key={b} className={`badge badge-${b}`}>
                {b === "viral" ? "🔥 Viral" : b === "nuevo" ? "Nuevo" : "★ Top ventas"}
              </span>
            ))}
            {product.segments.map((s) => (
              <span key={s} className="badge badge-soft">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* info */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-teal-deep)" }}>
            {product.category}
          </span>
          <h1 className="font-display text-4xl md:text-5xl mt-2 mb-3">{product.name}</h1>
          <p className="text-lg mb-6" style={{ color: "var(--color-ink-soft)" }}>
            {product.tagline}
          </p>

          <ProductDetailBuy product={product} wholesale={wholesale} />

          <div className="mt-8">
            <h2 className="font-display text-xl mb-2">Descripción</h2>
            <p style={{ color: "var(--color-ink-soft)" }}>{product.description}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 mt-6">
            <Spec label="Categoría" value={product.category} />
            <Spec label="Mínimo mayorista" value={`${product.moq} uds`} />
            <Spec label="Caja máster" value={`${product.unitsPerCase} uds`} />
            <Spec label="Disponibilidad" value={product.stock > 0 ? "En inventario" : "Bajo pedido"} />
          </dl>
        </div>
      </div>

      {/* related */}
      <section className="mt-20">
        <h2 className="font-display text-2xl md:text-3xl mb-6">También te puede vender 👀</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((p) => (
            <ProductCard key={p.id} product={p} wholesale={wholesale} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-flat px-4 py-3">
      <dt className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        {label}
      </dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
