import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/db";
import { getSessionBusiness } from "@/lib/auth";
import { ExclusiveBuy } from "@/components/exclusive-buy";

// Link cerrado: muestra SOLO este producto, sin header/footer ni navegación al
// resto de la tienda (el chrome lo oculta `ChromeGate` para las rutas
// `/exclusivo/*`). `noindex` para que no aparezca en buscadores.
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
  const wholesale = business?.status === "verified";

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
            <div className="card aspect-square overflow-hidden relative" style={{ background: product.gradient }}>
              {product.videoUrl ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video
                  src={product.videoUrl}
                  poster={product.imageUrl || undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : product.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.imageUrl} alt={product.name} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <span className="absolute inset-0 grid place-items-center text-[10rem] drop-shadow-xl">{product.emoji}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {product.badges.map((b) => (
                <span key={b} className={`badge badge-${b}`}>
                  {b === "viral" ? "🔥 Viral" : b === "nuevo" ? "Nuevo" : "★ Top ventas"}
                </span>
              ))}
            </div>
          </div>

          {/* info + compra contenida */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--color-teal-deep)" }}>
              {product.category}
            </span>
            <h1 className="font-display text-4xl md:text-5xl mt-2 mb-3">{product.name}</h1>
            <p className="text-lg mb-6" style={{ color: "var(--color-ink-soft)" }}>
              {product.tagline}
            </p>

            <ExclusiveBuy
              product={product}
              wholesale={wholesale}
              businessId={wholesale ? business?.id : undefined}
            />

            <div className="mt-8">
              <h2 className="font-display text-xl mb-2">Descripción</h2>
              <p style={{ color: "var(--color-ink-soft)" }}>{product.description}</p>
            </div>

            <dl className="grid grid-cols-2 gap-3 mt-6">
              <Spec label="Categoría" value={product.category} />
              <Spec label="Disponibilidad" value={product.stock > 0 ? "En inventario" : "Bajo pedido"} />
            </dl>
          </div>
        </div>

        <p className="text-center text-xs mt-12" style={{ color: "var(--color-muted)" }}>
          © {new Date().getFullYear()} Mi Tiendita PR · Enlace privado · Hecho en Puerto Rico 🇵🇷
        </p>
      </div>
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
