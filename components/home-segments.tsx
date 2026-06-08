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
    desc: "Conveniencia e impulso: cargadores, cables, linternas y gadgets de alta rotación.",
    color: "var(--color-teal)",
  },
  {
    icon: "🏪",
    title: "Mini-markets",
    desc: "Lo que vende solo: gadgets, hogar viral y compras de impulso.",
    color: "var(--color-grape)",
  },
];

export function HomeSegments() {
  return (
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
  );
}
