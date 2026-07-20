import Link from "next/link";

/** Composición deliberada (no aleatoria): un emoji por categoría, un color de marca por tile. */
const TILES = [
  { emoji: "🎧", color: "var(--color-coral)" },
  { emoji: "🔋", color: "var(--color-teal)" },
  { emoji: "🛞", color: "var(--color-sun)" },
  { emoji: "🌀", color: "var(--color-grape)" },
];

/** Escondido por ahora — poner en true para restaurar el hero completo. */
const MOSTRAR_HERO = false;

export function HomeHero() {
  return (
    <section className="relative overflow-hidden">
      {MOSTRAR_HERO && (
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
              Soy negocio
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

        {/* mood board: 2×2 calmado, un color de marca por tile */}
        <div className="relative hidden lg:block">
          <div className="grid grid-cols-2 gap-4 max-w-sm ml-auto">
            {TILES.map((t, i) => (
              <div
                key={t.emoji}
                className="aspect-square grid place-items-center text-5xl card reveal"
                style={{ background: t.color, animationDelay: `${200 + i * 80}ms` }}
              >
                {t.emoji}
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
      )}
    </section>
  );
}
