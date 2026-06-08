const WHY = [
  { icon: "🔎", title: "Lo viral, curado", desc: "Seleccionamos solo lo que de verdad se está vendiendo. Cero relleno.", color: "var(--color-coral)" },
  { icon: "🌎", title: "Importación directa", desc: "Traemos el producto a Puerto Rico para que pagues menos.", color: "var(--color-teal)" },
  { icon: "✅", title: "Calidad probada", desc: "Revisamos cada producto antes de ponerlo en el catálogo.", color: "var(--color-sun)" },
  { icon: "🚚", title: "Entrega en toda la isla", desc: "Recíbelo rápido, estés donde estés en PR.", color: "var(--color-grape)" },
];

export function HomeWhy() {
  return (
    <section className="wrap py-16">
      <div className="max-w-2xl mb-10">
        <span className="eyebrow">Por qué Mi Tiendita PR</span>
        <h2 className="font-display text-3xl md:text-5xl mt-3 mb-3">
          Calidad importada, precio de aquí.
        </h2>
        <p style={{ color: "var(--color-ink-soft)" }}>
          Buscamos lo que se está volviendo viral, lo traemos directo a Puerto Rico
          y te lo entregamos. Tú solo eliges lo que te gusta.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WHY.map((s) => (
          <div key={s.title} className="card-flat p-5">
            <div
              className="grid place-items-center w-12 h-12 rounded-xl text-2xl mb-4"
              style={{ background: s.color, border: "2px solid var(--color-ink)" }}
            >
              {s.icon}
            </div>
            <h3 className="font-display text-lg mb-1">{s.title}</h3>
            <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
