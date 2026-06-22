import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/db";
import { getSessionBusiness } from "@/lib/auth";
import { productImages } from "@/lib/products";
import { toPublicProduct } from "@/lib/public-product";
import { safeVideoUrl } from "@/lib/url-safe";
import { ProductGallery } from "@/components/product-gallery";
import { ExclusiveBuy } from "@/components/exclusive-buy";

// Link cerrado: muestra SOLO este producto, sin header/footer ni navegación al
// resto de la tienda (el chrome lo oculta `ChromeGate` en `/exclusivo/*`).
// `noindex` para que no aparezca en buscadores.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: product ? `${product.name} — Oferta exclusiva` : "Oferta exclusiva",
    description: product?.tagline,
    robots: { index: false, follow: false },
  };
}

export default async function ExclusiveProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.active === false) notFound();

  const business = await getSessionBusiness();
  const verified = business?.status === "verified";
  const pub = toPublicProduct(product, verified);

  const images = productImages(product);
  const videoUrl = safeVideoUrl(product.videoUrl);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-cream)" }}>
      {/* marca no-navegable: se ve legítimo pero no lleva a ningún otro sitio */}
      <div className="wrap pt-8 pb-2 flex items-center gap-2">
        <span
          className="grid place-items-center w-9 h-9 rounded-xl text-lg"
          style={{
            background: "var(--color-coral)",
            border: "2px solid var(--color-ink)",
            boxShadow: "var(--shadow-pop-sm)",
          }}
        >
          🛒
        </span>
        <span className="font-display text-xl font-bold leading-none">
          Mi Tiendita<span style={{ color: "var(--color-coral)" }}> PR</span>
        </span>
        <span
          className="ml-auto text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full"
          style={{ background: "var(--color-ink)", color: "var(--color-cream)" }}
        >
          🔒 Oferta exclusiva
        </span>
      </div>

      <div className="wrap pb-16 pt-4">
        <div className="grid lg:grid-cols-2 gap-10">
          {/* visual */}
          <div>
            <ProductGallery
              images={images}
              videoUrl={videoUrl}
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
            </div>
          </div>

          {/* info + compra contenida */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-teal-deep)" }}>
              {pub.category}
            </span>
            <h1 className="font-display text-4xl md:text-5xl mt-2 mb-3">{pub.name}</h1>
            <p className="text-lg mb-6" style={{ color: "var(--color-ink-soft)" }}>
              {pub.tagline}
            </p>

            <ExclusiveBuy product={pub} wholesale={verified} />

            <div className="mt-8">
              <h2 className="font-display text-xl mb-2">Descripción</h2>
              <p style={{ color: "var(--color-ink-soft)" }}>{pub.description}</p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs mt-12" style={{ color: "var(--color-muted)" }}>
          © {new Date().getFullYear()} Mi Tiendita PR · Enlace privado · Hecho en Puerto Rico 🇵🇷
        </p>
      </div>
    </div>
  );
}
