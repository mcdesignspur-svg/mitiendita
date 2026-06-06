import Link from "next/link";
import { listProducts } from "@/lib/db";
import { getSessionBusiness } from "@/lib/auth";
import { ProductCard } from "@/components/product-card";

const HERO_TILES = ["🛞", "🎧", "🔋", "🌀", "🫙", "💆", "🌈", "📍", "⚡"];

const SEGMENTS = [
  {
    icon: "🧑",
    title: "Individuos",
    desc: "Compra al detal lo último viral. Entrega en todo PR.",
    color: "var(--color-coral)",
  },
  {
    icon: "⛽",
    title: "Gasolineras",
    desc: "Góndolas de impulso: cargadores, audífonos, accesorios de auto.",
    color: "var(--color-sun)",
  },
  {
    icon: "💊",
    title: "Farmacias",
    desc: "Bienestar, belleza y salud de alta rotación y buen margen.",
    color: "var(--color-teal)",
  },
  {
    icon: "🏪",
    title: "Mini-markets",
    desc: "Lo que vende solo: gadgets, hogar viral y compras de impulso.",
    color: "var(--color-grape)",
  },
];

const WHY = [
  { n: "01", icon: "🔎", title: "Lo viral, curado", desc: "Seleccionamos solo lo que de verdad se está vendiendo. Cero relleno." },
  { n: "02", icon: "🌎", title: "Importación directa", desc: "Traemos el producto a Puerto Rico para que pagues menos." },
  { n: "03", icon: "✅", title: "Calidad probada", desc: "Revisamos cada producto antes de ponerlo en el catálogo." },
  { n: "04", icon: "🚚", title: "Entrega en toda la isla", desc: "Recíbelo rápido, estés donde estés en PR." },
];

export default async function HomePage() {
  const business = await getSessionBusiness();
  const wholesale = business?.status === "verified";
  const products = await listProducts({ activeOnly: true });
  const featured = products.filter((p) => p.badges.includes("viral")).slice(0, 6);

  return (
    <>
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden">
        <div className="wrap pt-14 pb-12 md:pt-20 md:pb-16 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <span className="eyebrow reveal" style={{ animationDelay: "0ms" }}>
              Importado · Viral · Directo a tu puerta 🇵🇷
            </span>
            <h1
              className="font-display text-5xl md:text-7xl mt-4 mb-5 text-balance reveal"
              style={{ animationDelay: "80ms" }}
            >
              Lo viral,{" "}
              <span style={{ color: "var(--color-coral)" }}>importado</span> y a tu puerta.
            </h1>
            <p
              className="text-lg max-w-md mb-8 reveal"
              style={{ color: "var(--color-ink-soft)", animationDelay: "160ms" }}
            >
              Productos de alta utilidad que se venden solos. Compra al detal o abre
              tu cuenta de negocio y recibe <strong>precios al por mayor</strong>.
            </p>
            <div className="flex flex-wrap gap-3 reveal" style={{ animationDelay: "240ms" }}>
              <Link href="/productos" className="btn btn-primary">
                Ver catálogo →
              </Link>
              <Link href="/para-negocios" className="btn btn-ghost">
                Soy negocio 🏪
              </Link>
            </div>
            <div
              className="flex flex-wrap gap-x-6 gap-y-2 mt-8 text-sm font-semibold reveal"
              style={{ color: "var(--color-ink-soft)", animationDelay: "320ms" }}
            >
              <span>✅ +15 productos virales</span>
              <span>✅ Entregas en todo PR</span>
              <span>✅ Mayoreo verificado</span>
            </div>
          </div>

          {/* tile collage */}
          <div className="relative hidden lg:block">
            <div className="grid grid-cols-3 gap-3">
              {HERO_TILES.map((t, i) => (
                <div
                  key={i}
                  className="aspect-square grid place-items-center text-4xl card reveal"
                  style={{
                    background:
                      i % 3 === 0
                        ? "var(--color-coral)"
                        : i % 3 === 1
                          ? "var(--color-teal)"
                          : "var(--color-sun)",
                    animationDelay: `${200 + i * 60}ms`,
                    transform: `rotate(${(i % 2 ? 1 : -1) * 2}deg)`,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
            <div
              className="absolute -bottom-5 -left-5 badge badge-viral text-sm"
              style={{ transform: "rotate(-6deg)", boxShadow: "var(--shadow-pop-sm)" }}
            >
              🔥 Trending ahora
            </div>
          </div>
        </div>

        {/* marquee */}
        <div
          className="border-y-2 py-3 overflow-hidden"
          style={{ borderColor: "var(--color-ink)", background: "var(--color-ink)" }}
        >
          <div className="marquee-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0">
                {[
                  "Cargadores",
                  "Audífonos TWS",
                  "Gadgets de auto",
                  "Belleza & bienestar",
                  "Hogar viral",
                  "Power banks",
                  "Accesorios virales",
                  "Importación directa",
                ].map((w) => (
                  <span
                    key={dup + w}
                    className="px-6 text-sm font-bold uppercase tracking-wider"
                    style={{ color: "var(--color-cream)" }}
                  >
                    ✦ {w}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== SEGMENTOS ===================== */}
      <section className="wrap py-16">
        <div className="flex items-end justify-between flex-wrap gap-3 mb-8">
          <div>
            <span className="eyebrow">Para quién</span>
            <h2 className="font-display text-3xl md:text-4xl mt-2">Vendemos a todos.</h2>
          </div>
          <p className="text-sm max-w-xs" style={{ color: "var(--color-ink-soft)" }}>
            Un solo catálogo, dos formas de comprar: al detal o al por mayor para tu comercio.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SEGMENTS.map((s) => (
            <div key={s.title} className="card p-5">
              <div
                className="grid place-items-center w-12 h-12 rounded-xl text-2xl mb-4"
                style={{ background: s.color, border: "2px solid var(--color-ink)" }}
              >
                {s.icon}
              </div>
              <h3 className="font-display text-xl mb-1">{s.title}</h3>
              <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================== DESTACADOS ===================== */}
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
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} wholesale={wholesale} />
          ))}
        </div>
      </section>

      {/* ===================== POR QUÉ ===================== */}
      <section className="wrap py-16">
        <div
          className="card p-8 md:p-12"
          style={{ background: "var(--color-ink)", color: "var(--color-cream)" }}
        >
          <span className="eyebrow" style={{ color: "var(--color-sun)" }}>
            Por qué Mi Tiendita PR
          </span>
          <h2 className="font-display text-3xl md:text-5xl mt-3 mb-3 max-w-2xl">
            Calidad importada, precio de aquí.
          </h2>
          <p className="max-w-xl mb-10" style={{ color: "#cfc6b6" }}>
            Buscamos lo que se está volviendo viral, lo traemos directo a Puerto Rico
            y te lo entregamos. Tú solo eliges lo que te gusta.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY.map((s) => (
              <div
                key={s.n}
                className="p-5 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.14)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">{s.icon}</span>
                  <span className="font-display text-2xl" style={{ color: "var(--color-sun)" }}>
                    {s.n}
                  </span>
                </div>
                <h3 className="font-display text-lg mb-1">{s.title}</h3>
                <p className="text-sm" style={{ color: "#cfc6b6" }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link href="/productos" className="btn btn-primary">
              Explorar catálogo →
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== B2B CTA ===================== */}
      <section className="wrap pb-20">
        <div
          className="card p-8 md:p-12 grid md:grid-cols-[1.4fr_1fr] gap-8 items-center"
          style={{ background: "var(--color-coral)", color: "#fff" }}
        >
          <div>
            <span className="eyebrow" style={{ color: "#fff" }}>
              Para negocios
            </span>
            <h2 className="font-display text-3xl md:text-5xl mt-3 mb-3">
              Precios al por mayor para tu comercio.
            </h2>
            <p className="max-w-md" style={{ color: "#ffe9e2" }}>
              Gasolineras, farmacias, colmados y mini-markets: crea tu cuenta con tu
              Registro de Comerciante y desbloquea precios mayoristas al instante tras la verificación.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              href="/negocios/registro"
              className="btn"
              style={{ background: "#fff", color: "var(--color-ink)", borderColor: "var(--color-ink)", boxShadow: "var(--shadow-pop-sm)" }}
            >
              Crear cuenta de negocio →
            </Link>
            <Link
              href="/para-negocios"
              className="btn btn-ink"
              style={{ borderColor: "var(--color-ink)" }}
            >
              ¿Cómo funciona?
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
