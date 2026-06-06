import Link from "next/link";
import { listBusinesses, listOrders, listProducts } from "@/lib/db";
import { SOURCING_CANDIDATES, scoreFor } from "@/lib/sourcing";
import { money, pct } from "@/lib/format";
import { approveBusinessAction, rejectBusinessAction } from "@/lib/actions";
import { CopyStudio } from "@/components/copy-studio";

export const metadata = { title: "Panel de operación — Mi Tiendita PR" };

const STAGE_COLOR: Record<string, string> = {
  Detectado: "var(--color-muted)",
  Evaluando: "var(--color-grape)",
  Negociando: "var(--color-coral)",
  Ordenado: "var(--color-teal-deep)",
};

export default async function AdminPage() {
  const businesses = await listBusinesses();
  const pending = businesses.filter((b) => b.status === "pending");
  const verified = businesses.filter((b) => b.status === "verified");
  const orders = await listOrders();
  const products = await listProducts();
  const activeProducts = products.filter((p) => p.active !== false);
  const gmv = orders.reduce((s, o) => s + o.total, 0);
  const candidates = SOURCING_CANDIDATES.map((c) => ({ ...c, score: scoreFor(c) })).sort(
    (a, b) => b.score - a.score,
  );

  return (
    <div className="wrap py-10">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <span className="eyebrow">Operación interna</span>
          <h1 className="font-display text-4xl md:text-5xl mt-2">Panel de control 🤖</h1>
        </div>
        <Link href="/admin/productos" className="btn btn-primary btn-sm">
          Gestionar productos →
        </Link>
      </div>

      {/* metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <Metric value={`${activeProducts.length}/${products.length}`} label="Productos activos" accent="var(--color-teal-deep)" href="/admin/productos" />
        <Metric value={String(pending.length)} label="Verificaciones pendientes" accent="var(--color-coral)" />
        <Metric value={String(orders.length)} label="Pedidos totales" accent="var(--color-grape)" />
        <Metric value={money(gmv)} label="Ventas registradas" accent="var(--color-ink)" />
      </div>

      {/* verifications */}
      <Section title="Verificaciones de negocios" sub="Aprueba o rechaza el Registro de Comerciante.">
        {pending.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>No hay verificaciones pendientes. 🎉</p>
        ) : (
          <div className="space-y-3">
            {pending.map((b) => (
              <div key={b.id} className="card p-4 flex flex-wrap items-center gap-4 justify-between">
                <div className="min-w-0">
                  <div className="font-display text-lg">{b.businessName}</div>
                  <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
                    {typeLabel(b.type)} · {b.municipio} · {b.contactName}
                  </div>
                  <div className="text-sm mt-1">
                    <span className="font-semibold">Registro:</span>{" "}
                    <span style={{ color: "var(--color-coral-deep)" }}>{b.registroComerciante}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <form action={approveBusinessAction}>
                    <input type="hidden" name="bid" value={b.id} />
                    <button className="btn btn-primary btn-sm">✓ Aprobar</button>
                  </form>
                  <form action={rejectBusinessAction}>
                    <input type="hidden" name="bid" value={b.id} />
                    <button className="btn btn-ghost btn-sm">Rechazar</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* sourcing */}
      <Section title="Pipeline de sourcing (Alibaba)" sub="Candidatos detectados y puntuados por potencial viral, margen y logística.">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <span className="text-3xl">{c.emoji}</span>
                <span
                  className="badge"
                  style={{ background: STAGE_COLOR[c.stage], color: "#fff", borderColor: "var(--color-ink)" }}
                >
                  {c.stage}
                </span>
              </div>
              <h3 className="font-display text-lg leading-tight mb-1">{c.name}</h3>
              <p className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>{c.supplier}</p>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-cream-2)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.score}%`, background: c.score > 70 ? "var(--color-teal)" : "var(--color-sun)" }}
                  />
                </div>
                <span className="font-display text-lg tabular-nums">{c.score}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Mini label="Costo" value={money(c.unitCost)} />
                <Mini label="Retail" value={money(c.estRetail)} />
                <Mini label="Margen" value={pct((c.estRetail - c.unitCost) / c.estRetail)} />
              </div>
              <p className="text-xs mt-3 font-semibold" style={{ color: "var(--color-teal-deep)" }}>
                📈 {c.signal}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* copy studio */}
      <Section title="Estudio de marketing" sub="Genera copy de redes para cualquier producto del catálogo.">
        <CopyStudio products={products.map((p) => ({ name: p.name, category: p.category }))} />
      </Section>

      {/* orders */}
      <Section title="Pedidos recientes" sub="B2C y B2B registrados en la operación.">
        {orders.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>Aún no hay pedidos.</p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 10).map((o) => (
              <div key={o.id} className="card-flat px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="font-semibold">{o.id}</span>
                  <span className={`badge ${o.kind === "b2b" ? "badge-nuevo" : "badge-soft"} ml-2`}>
                    {o.kind === "b2b" ? "Mayorista" : "Detal"}
                  </span>
                  <span className="text-sm ml-2" style={{ color: "var(--color-muted)" }}>
                    {o.customerName} · {o.items.reduce((s, i) => s + i.qty, 0)} uds
                  </span>
                </div>
                <span className="font-display text-lg">{money(o.total)}</span>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
      <p className="text-sm mb-5 mt-1" style={{ color: "var(--color-ink-soft)" }}>{sub}</p>
      {children}
    </section>
  );
}

function Metric({
  value,
  label,
  accent,
  href,
}: {
  value: string;
  label: string;
  accent: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="font-display text-3xl md:text-4xl" style={{ color: accent }}>{value}</div>
      <div className="text-sm font-semibold mt-1" style={{ color: "var(--color-ink-soft)" }}>{label}</div>
    </>
  );
  return href ? (
    <Link href={href} className="card p-5 block hover:-translate-y-0.5 transition-transform">
      {inner}
    </Link>
  ) : (
    <div className="card p-5">{inner}</div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg py-1.5" style={{ background: "var(--color-cream-2)" }}>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>{label}</div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  );
}

function typeLabel(t: string): string {
  return (
    {
      gasolinera: "Gasolinera",
      farmacia: "Farmacia",
      minimarket: "Mini-market",
      colmado: "Colmado",
      otro: "Otro comercio",
    }[t] || t
  );
}
