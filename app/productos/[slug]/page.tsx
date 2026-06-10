import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, relatedProducts } from "@/lib/db";
import { getSessionBusiness } from "@/lib/auth";
import { productImages } from "@/lib/products";
import { toPublicProduct } from "@/lib/public-product";
import { safeImageUrl } from "@/lib/url-safe";
import { ProductDetailBuy } from "@/components/product-detail-buy";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard } from "@/components/product-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Producto" };

  const imageUrl = safeImageUrl(product.imageUrl);
  return {
    title: product.name,
    description: product.tagline,
    openGraph: {
      title: `${product.name} — Mi Tiendita PR`,
      description: product.tagline,
      ...(imageUrl ? { images: [{ url: imageUrl, alt: product.name }] } : {}),
    },
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
  const verified = business?.status === "verified";
  const related = await relatedProducts(slug, 3);

  const pub = toPublicProduct(product, verified);
  const relatedPub = related.map((p) => toPublicProduct(p, verified));

  const imageUrl = safeImageUrl(product.imageUrl);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: imageUrl ?? undefined,
    offers: {
      "@type": "Offer",
      price: product.retail.toFixed(2),
      priceCurrency: "USD",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/PreOrder",
      url: `https://mitienditapr.com/productos/${product.slug}`,
    },
  };

  return (
    <div className="wrap py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
          <ProductGallery
            images={productImages(product)}
            gradient={product.gradient}
            emoji={product.emoji}
            name={product.name}
          />
          <div className="flex flex-wrap gap-2 mt-4">
            {pub.badges.map((b) => (
              <span key={b} className={`badge badge-${b}`}>
                {b === "viral" ? "🔥 Viral" : b === "nuevo" ? "Nuevo" : "★ Top ventas"}
              </span>
            ))}
            {pub.segments.map((s) => (
              <span key={s} className="badge badge-soft">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* info */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-teal-deep)" }}>
            {pub.category}
          </span>
          <h1 className="font-display text-4xl md:text-5xl mt-2 mb-3">{pub.name}</h1>
          <p className="text-lg mb-6" style={{ color: "var(--color-ink-soft)" }}>
            {pub.tagline}
          </p>

          <ProductDetailBuy product={pub} wholesale={verified} />

          <div className="mt-8">
            <h2 className="font-display text-xl mb-2">Descripción</h2>
            <p style={{ color: "var(--color-ink-soft)" }}>{pub.description}</p>
          </div>

          <dl className="grid grid-cols-2 gap-3 mt-6">
            <Spec label="Categoría" value={pub.category} />
            <Spec label="Caja máster" value={`${pub.unitsPerCase} uds`} />
            <Spec label="Disponibilidad" value={pub.stock > 0 ? "En inventario" : "Bajo pedido"} />
          </dl>
        </div>
      </div>

      {/* OG image hero solo si existe foto — usando next/image para perf */}
      {imageUrl && (
        <div className="sr-only">
          <Image
            src={imageUrl}
            alt={pub.name}
            width={1200}
            height={630}
            priority
          />
        </div>
      )}

      {/* related */}
      <section className="mt-20">
        <h2 className="font-display text-2xl md:text-3xl mb-6">También te puede vender 👀</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {relatedPub.map((p) => (
            <ProductCard key={p.id} product={p} wholesale={verified} />
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
