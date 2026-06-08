import Link from "next/link";

export function HomeB2bCta() {
  return (
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
  );
}
