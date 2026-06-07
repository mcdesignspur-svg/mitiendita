import Link from "next/link";
import { listCampaigns, listProducts } from "@/lib/db";
import {
  createCampaignAction,
  finalizeCampaignAction,
  deleteCampaignAction,
} from "@/lib/actions";
import type { Campaign } from "@/lib/types";

export const metadata = { title: "Promociones — Mi Tiendita PR" };

const SEGMENTS = ["todos", "gasolineras", "farmacias", "minimarkets", "individuos"];

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  activa: { background: "#dff5e6", color: "var(--color-teal-deep)" },
  borrador: { background: "var(--color-cream-2)", color: "var(--color-ink-soft)" },
  finalizada: { background: "#eee", color: "var(--color-muted)" },
};

export default async function PromocionesPage() {
  const campaigns = await listCampaigns();
  const products = await listProducts();

  return (
    <div className="wrap py-10">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
        <div>
          <span className="eyebrow">Marketing</span>
          <h1 className="font-display text-4xl md:text-5xl mt-2">Promociones 🎉</h1>
        </div>
        <Link href="/admin/aprobaciones" className="btn btn-ghost btn-sm">Ver aprobaciones →</Link>
      </div>
      <p className="text-sm mb-8" style={{ color: "var(--color-ink-soft)" }}>
        Crea una campaña con descuento sobre un set de productos. Aprobarla en Aprobaciones activa el
        descuento en la tienda; finalizarla lo quita.
      </p>

      {/* create campaign */}
      <section className="mb-10">
        <details className="card p-4" open={campaigns.length === 0}>
          <summary className="font-display text-lg cursor-pointer">+ Nueva promoción</summary>
          <form action={createCampaignAction} className="mt-4 space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="name">Nombre *</label>
                <input id="name" name="name" className="field" placeholder="Especial de verano boricua" required />
              </div>
              <div>
                <label className="label" htmlFor="discountPercent">Descuento % *</label>
                <input id="discountPercent" name="discountPercent" type="number" min={1} max={90} className="field" placeholder="15" required />
              </div>
              <div>
                <label className="label" htmlFor="segment">Segmento</label>
                <select id="segment" name="segment" className="field capitalize" defaultValue="todos">
                  {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="endsAt">Termina (opcional)</label>
                <input id="endsAt" name="endsAt" type="date" className="field" />
              </div>
            </div>
            <div>
              <label className="label">Productos *</label>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-auto p-2 rounded-xl" style={{ background: "var(--color-cream-2)" }}>
                {products.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="pids" value={p.id} />
                    <span>{p.emoji} {p.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <button className="btn btn-primary">Crear promoción →</button>
          </form>
        </details>
      </section>

      {/* campaigns */}
      <section>
        <h2 className="font-display text-2xl mb-4">Campañas ({campaigns.length})</h2>
        {campaigns.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>Aún no hay campañas.</p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((c) => <CampaignCard key={c.id} c={c} productCount={c.productIds.length} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function CampaignCard({ c, productCount }: { c: Campaign; productCount: number }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display text-lg leading-tight">{c.name}</h3>
            <span className="badge capitalize" style={STATUS_STYLE[c.status] ?? STATUS_STYLE.borrador}>{c.status}</span>
          </div>
          <p className="text-sm mt-1" style={{ color: "var(--color-ink-soft)" }}>
            {c.discountPercent}% off · {productCount} productos · segmento {c.segment ?? "todos"}
            {c.endsAt ? ` · hasta ${c.endsAt.slice(0, 10)}` : ""}
          </p>
          {c.copy && (
            <pre className="text-xs mt-2 p-3 rounded-xl whitespace-pre-wrap" style={{ background: "var(--color-cream-2)" }}>{c.copy}</pre>
          )}
        </div>
        <div className="font-display text-2xl" style={{ color: "var(--color-coral)" }}>-{c.discountPercent}%</div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4 items-center">
        {c.status === "activa" && (
          <form action={finalizeCampaignAction}>
            <input type="hidden" name="cid" value={c.id} />
            <button className="btn btn-ghost btn-sm">■ Finalizar</button>
          </form>
        )}
        {c.status === "borrador" && (
          <Link href="/admin/aprobaciones" className="btn btn-ghost btn-sm">Aprobar en cola →</Link>
        )}
        <form action={deleteCampaignAction}>
          <input type="hidden" name="cid" value={c.id} />
          <button className="btn btn-ghost btn-sm" title="Eliminar" style={{ color: "var(--color-coral-deep)" }}>✕</button>
        </form>
      </div>
    </div>
  );
}
