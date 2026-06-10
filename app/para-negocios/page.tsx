import Link from "next/link";
import { listProducts } from "@/lib/db";
import { money, marginPct, pct } from "@/lib/format";
import { toPublicProduct } from "@/lib/public-product";
import { getSessionBusiness } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Para Negocios",
  description:
    "Precios mayoristas para gasolineras, farmacias, colmados y mini-markets en Puerto Rico. Regístrate con tu Registro de Comerciante.",
};

const BENEFITS = [
  { icon: "🏷️", title: "Precios mayoristas", desc: "Hasta 60% menos que el precio al detal en productos de alta rotación." },
  { icon: "📦", title: "Cajas máster", desc: "Compra por caja con mínimos pensados para reposición de góndola." },
  { icon: "🔁", title: "Reposición inteligente", desc: "Te decimos qué reordenar según lo que más se vende en tu zona." },
  { icon: "🚚", title: "Entrega en PR", desc: "Distribución a gasolineras, farmacias y mini-markets en toda la isla." },
  { icon: "📈", title: "Productos que venden", desc: "Curaduría de lo viral: lo que la gente ya está buscando en redes." },
  { icon: "🧾", title: "Facturación clara", desc: "Histórico de pedidos y precios netos para tu contabilidad." },
];

const STEPS = [
  { n: "1", title: "Crea tu cuenta", desc: "Registra tu negocio con tu número de Registro de Comerciante." },
  { n: "2", title: "Verificamos", desc: "Validamos tu Registro de Comerciante (Hacienda PR). Normalmente en horas." },
  { n: "3", title: "Compra al por mayor", desc: "Al verificarte, los precios mayoristas se desbloquean en todo el catálogo." },
];

export default async function ParaNegociosPage() {
  const business = await getSessionBusiness();
  const products = await listProducts({ activeOnly: true });
  const sampleRaw = products
    .filter((p) => p.badges.includes("top") || p.badges.includes("viral"))
    .slice(0, 5);

  // avgMargin se calcula server-side usando landedCost (campo interno, nunca va al cliente)
  const avgMarginValue =
    sampleRaw.length === 0
      ? 0
      : sampleRaw.reduce((s, p) => s + marginPct(p.wholesale, p.landedCost), 0) / sampleRaw.length;

  // Tabla de ejemplos de ahorro: es marketing deliberado — muestra wholesale
  // (precio mayorista es el argumento de venta de la página B2B). No se expone
  // landedCost ni sourceUrl.
  const samples = sampleRaw.map((p) => toPublicProduct(p, true));

  return (
    <>
      {/* hero */}
      <section className="wrap pt-14 pb-10">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div>
            <span className="eyebrow">Para negocios B2B</span>
            <h1 className="font-display text-5xl md:text-6xl mt-3 mb-4 text-balance">
              Surtido viral a precio de <span style={{ color: "var(--color-teal-deep)" }}>mayorista</span>.
            </h1>
            <p className="text-lg max-w-md mb-7" style={{ color: "var(--color-ink-soft)" }}>
              Gasolineras, farmacias, colmados y mini-markets: llena tus góndolas con
              productos que se venden solos. Precios netos para comercios verificados.
            </p>
            {business?.status === "verified" ? (
              <div className="flex flex-wrap gap-3">
                <Link href="/productos" className="btn btn-primary">Ver catálogo mayorista →</Link>
                <Link href="/negocios/cuenta" className="btn btn-ghost">Mi cuenta</Link>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Link href="/negocios/registro" className="btn btn-primary">Crear cuenta de negocio →</Link>
                <Link href="/negocios/entrar" className="btn btn-ghost">Ya tengo cuenta</Link>
              </div>
            )}
          </div>

          {/* savings table — marketing deliberado: muestra precios mayoristas */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 text-sm font-bold" style={{ background: "var(--color-ink)", color: "var(--color-cream)" }}>
              Ejemplos de ahorro mayorista
            </div>
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr style={{ color: "var(--color-muted)" }}>
                  <th className="text-left font-semibold px-2 sm:px-4 py-2">Producto</th>
                  <th className="text-right font-semibold px-2 sm:px-3 py-2">Detal</th>
                  <th className="text-right font-semibold px-2 sm:px-3 py-2">Mayor</th>
                  <th className="text-right font-semibold px-2 sm:px-4 py-2">Ahorro</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((p) => (
                  <tr key={p.id} className="border-t" style={{ borderColor: "var(--color-line)" }}>
                    <td className="px-2 sm:px-4 py-2.5 font-medium">{p.emoji} {p.name.split(" ").slice(0, 2).join(" ")}</td>
                    <td className="px-2 sm:px-3 py-2.5 text-right tabular-nums" style={{ color: "var(--color-muted)" }}>{money(p.retail)}</td>
                    <td className="px-2 sm:px-3 py-2.5 text-right tabular-nums font-bold" style={{ color: "var(--color-teal-deep)" }}>{money(p.wholesale!)}</td>
                    <td className="px-2 sm:px-4 py-2.5 text-right">
                      <span className="badge badge-top">−{pct(1 - p.wholesale! / p.retail)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* benefits */}
      <section className="wrap py-12">
        <h2 className="font-display text-3xl md:text-4xl mb-8">Lo que recibe tu negocio</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div key={b.title} className="card p-5">
              <span className="text-3xl">{b.icon}</span>
              <h3 className="font-display text-lg mt-3 mb-1">{b.title}</h3>
              <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* verification */}
      <section id="verificacion" className="wrap py-12 scroll-mt-24">
        <div className="card p-8 md:p-12" style={{ background: "var(--color-teal-deep)", color: "#fff" }}>
          <span className="eyebrow" style={{ color: "var(--color-sun)" }}>Verificación</span>
          <h2 className="font-display text-3xl md:text-5xl mt-3 mb-3">Precios serios para comercios serios.</h2>
          <p className="max-w-xl mb-10" style={{ color: "#d6f2ee" }}>
            Los precios mayoristas están reservados para negocios con Registro de Comerciante
            válido. Así protegemos los márgenes de nuestros socios comerciales.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.08)" }}>
                <span className="font-display text-4xl" style={{ color: "var(--color-sun)" }}>{s.n}</span>
                <h3 className="font-display text-lg mt-2 mb-1">{s.title}</h3>
                <p className="text-sm" style={{ color: "#d6f2ee" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* margin proof */}
      <section className="wrap py-12">
        <div className="card-flat p-6 md:p-8 grid md:grid-cols-3 gap-6 text-center">
          <Stat big={`${pct(avgMarginValue)}`} label="Margen promedio para tu negocio" />
          <Stat big={`${products.length}`} label="Productos virales en catálogo" />
          <Stat big="24-48h" label="Tiempo típico de verificación" />
        </div>
      </section>

      {/* CTA */}
      <section className="wrap pb-20">
        <div className="card p-8 md:p-12 text-center" style={{ background: "var(--color-sun)" }}>
          <h2 className="font-display text-3xl md:text-5xl mb-3">¿List@ para surtir tu góndola?</h2>
          <p className="max-w-md mx-auto mb-6" style={{ color: "var(--color-ink-soft)" }}>
            Crea tu cuenta hoy y empieza a comprar a precio de mayorista esta semana.
          </p>
          <Link href="/negocios/registro" className="btn btn-ink">Crear cuenta de negocio →</Link>
        </div>
      </section>
    </>
  );
}

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div>
      <div className="font-display text-4xl md:text-5xl" style={{ color: "var(--color-coral)" }}>{big}</div>
      <div className="text-sm font-semibold mt-1" style={{ color: "var(--color-ink-soft)" }}>{label}</div>
    </div>
  );
}

