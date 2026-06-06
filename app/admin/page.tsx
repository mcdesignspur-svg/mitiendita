import Link from "next/link";
import {
  listBusinesses,
  listOrders,
  listProducts,
  listCandidates,
  listSuppliers,
} from "@/lib/db";
import { scoreFor } from "@/lib/sourcing";
import { aiEnabled } from "@/lib/ai";
import { money, pct } from "@/lib/format";
import {
  discoverCandidatesAction,
  setCandidateStageAction,
  deleteCandidateAction,
  promoteCandidateAction,
  createSupplierAction,
  setSupplierStatusAction,
  deleteSupplierAction,
  draftOutreachAction,
} from "@/lib/actions";
import { CopyStudio } from "@/components/copy-studio";
import { VerificationCopilot } from "@/components/verification-copilot";
import type { SourcingCandidate, Supplier } from "@/lib/types";

export const metadata = { title: "Panel de operación — Mi Tiendita PR" };

const STAGE_COLOR: Record<string, string> = {
  Detectado: "var(--color-muted)",
  Evaluando: "var(--color-grape)",
  Negociando: "var(--color-coral)",
  Ordenado: "var(--color-teal-deep)",
  Descartado: "var(--color-ink-soft)",
};
const STAGES = ["Detectado", "Evaluando", "Negociando", "Ordenado", "Descartado"];
const SUPPLIER_STATUSES = ["nuevo", "contactado", "cotizando", "muestra", "aprobado", "descartado"];

export default async function AdminPage() {
  const businesses = await listBusinesses();
  const pending = businesses.filter((b) => b.status === "pending");
  const verified = businesses.filter((b) => b.status === "verified");
  const orders = await listOrders();
  const products = await listProducts();
  const candidatesRaw = await listCandidates();
  const suppliers = await listSuppliers();
  const activeProducts = products.filter((p) => p.active !== false);
  const gmv = orders.reduce((s, o) => s + o.total, 0);
  const candidates = candidatesRaw
    .map((c) => ({ ...c, score: scoreFor(c) }))
    .sort((a, b) => b.score - a.score);

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

      {!aiEnabled() && (
        <div
          className="card-flat px-4 py-3 mb-8 text-sm"
          style={{ background: "#fff6e0", borderColor: "#e8c879" }}
        >
          ⚙️ <strong>Modo plantilla.</strong> Añade <code>AI_GATEWAY_API_KEY</code> a tu{" "}
          <code>.env</code> para activar la inteligencia real (research, autocompletar,
          verificación, asistente). Todo funciona igual sin la key, con resultados deterministas.
        </div>
      )}

      {/* metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-12">
        <Metric value={`${activeProducts.length}/${products.length}`} label="Productos activos" accent="var(--color-teal-deep)" href="/admin/productos" />
        <Metric value={String(candidates.length)} label="Candidatos sourcing" accent="var(--color-grape)" />
        <Metric value={String(suppliers.length)} label="Suplidores" accent="var(--color-sun)" />
        <Metric value={String(pending.length)} label="Verificaciones" accent="var(--color-coral)" />
        <Metric value={money(gmv)} label="Ventas" accent="var(--color-ink)" />
      </div>

      {/* verifications */}
      <Section title="Verificaciones de negocios" sub="El copiloto AI revisa el Registro de Comerciante y recomienda; tú decides.">
        {pending.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>No hay verificaciones pendientes. 🎉</p>
        ) : (
          <div className="space-y-3">
            {pending.map((b) => (
              <VerificationCopilot
                key={b.id}
                business={{
                  id: b.id,
                  businessName: b.businessName,
                  type: b.type,
                  contactName: b.contactName,
                  municipio: b.municipio,
                  registroComerciante: b.registroComerciante,
                }}
              />
            ))}
          </div>
        )}
        <p className="text-xs mt-3" style={{ color: "var(--color-muted)" }}>
          {verified.length} negocios verificados con precio mayorista activo.
        </p>
      </Section>

      {/* sourcing */}
      <Section
        title="Pipeline de sourcing"
        sub="Lo que Claude (agente operador) investiga aterriza aquí. Promueve un candidato a producto con un clic."
      >
        <form action={discoverCandidatesAction} className="card p-4 mb-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="label" htmlFor="brief">Brief de descubrimiento</label>
            <input
              id="brief"
              name="brief"
              className="field"
              placeholder="ej. gadgets de carro para gasolineras · verano boricua · bajo MOQ"
            />
          </div>
          <button className="btn btn-primary">✨ Descubrir candidatos</button>
        </form>

        {candidates.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>
            Aún no hay candidatos. Usa “Descubrir” o corre <code>npm run operator -- ingest</code>.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {candidates.map((c) => (
              <CandidateCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </Section>

      {/* suppliers */}
      <Section
        title="Suplidores"
        sub="Proveedores que Claude investiga y contacta. Redacta el outreach con AI y registra el estado."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {suppliers.map((s) => (
            <SupplierCard key={s.id} s={s} />
          ))}
        </div>

        <details className="card p-4 mt-4">
          <summary className="font-display text-lg cursor-pointer">+ Añadir suplidor</summary>
          <form action={createSupplierAction} className="grid sm:grid-cols-2 gap-3 mt-4">
            <Input name="name" label="Nombre *" required />
            <Input name="platform" label="Plataforma" placeholder="Alibaba" />
            <Input name="url" label="Enlace" placeholder="https://..." />
            <Input name="country" label="País" placeholder="China" />
            <Input name="email" label="Email" />
            <Input name="whatsapp" label="WhatsApp" />
            <div className="sm:col-span-2">
              <Input name="products" label="Qué vende" placeholder="proyectores LED, deco viral" />
            </div>
            <div className="sm:col-span-2">
              <Input name="notes" label="Notas" />
            </div>
            <button className="btn btn-primary btn-sm sm:col-span-2 justify-self-start">Guardar suplidor</button>
          </form>
        </details>
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

function CandidateCard({ c }: { c: SourcingCandidate & { score: number } }) {
  const margin = c.estRetail > 0 ? (c.estRetail - c.unitCost) / c.estRetail : 0;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{c.emoji}</span>
        <div className="flex flex-col items-end gap-1">
          <span className="badge" style={{ background: STAGE_COLOR[c.stage], color: "#fff", borderColor: "var(--color-ink)" }}>
            {c.stage}
          </span>
          {(c.origin === "agente" || c.origin === "app") && (
            <span className="text-[10px] font-semibold" style={{ color: "var(--color-grape)" }}>🤖 agente</span>
          )}
        </div>
      </div>
      <h3 className="font-display text-lg leading-tight mb-1">{c.name}</h3>
      <p className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>{c.supplier || "sin suplidor"}</p>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-cream-2)" }}>
          <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.score > 70 ? "var(--color-teal)" : "var(--color-sun)" }} />
        </div>
        <span className="font-display text-lg tabular-nums">{c.score}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Mini label="Costo" value={money(c.unitCost)} />
        <Mini label="Retail" value={money(c.estRetail)} />
        <Mini label="Margen" value={pct(margin)} />
      </div>
      <p className="text-xs mt-3 font-semibold" style={{ color: "var(--color-teal-deep)" }}>📈 {c.signal}</p>
      {c.sourceUrl && (
        <a
          href={c.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold inline-flex items-center gap-1 mt-2 hover:underline"
          style={{ color: "var(--color-grape)" }}
        >
          🔗 Ver en Alibaba
        </a>
      )}

      <div className="flex flex-wrap gap-2 mt-4 items-center">
        {c.productId ? (
          <Link href={`/admin/productos/${c.productId}`} className="btn btn-ghost btn-sm">Ver producto →</Link>
        ) : (
          <form action={promoteCandidateAction}>
            <input type="hidden" name="cid" value={c.id} />
            <button className="btn btn-primary btn-sm">→ Crear producto</button>
          </form>
        )}
        <form action={setCandidateStageAction} className="flex items-center gap-1">
          <input type="hidden" name="cid" value={c.id} />
          <select name="stage" defaultValue={c.stage} className="field text-xs w-auto" style={{ padding: "6px 8px" }}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" title="Cambiar etapa">✓</button>
        </form>
        <form action={deleteCandidateAction}>
          <input type="hidden" name="cid" value={c.id} />
          <button className="btn btn-ghost btn-sm" title="Eliminar" style={{ color: "var(--color-coral-deep)" }}>✕</button>
        </form>
      </div>
    </div>
  );
}

function SupplierCard({ s }: { s: Supplier }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-tight">
            {s.url ? (
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.name}</a>
            ) : s.name}
          </h3>
          <p className="text-xs" style={{ color: "var(--color-muted)" }}>
            {s.platform}{s.country ? ` · ${s.country}` : ""}
          </p>
          {s.products && <p className="text-sm mt-1">{s.products}</p>}
        </div>
        <span className="badge badge-soft capitalize">{s.status}</span>
      </div>

      {s.notes && <p className="text-sm mt-2" style={{ color: "var(--color-ink-soft)" }}>{s.notes}</p>}

      {s.outreachDraft && (
        <details className="mt-3">
          <summary className="text-sm font-semibold cursor-pointer" style={{ color: "var(--color-grape)" }}>
            ✉️ Ver borrador de outreach
          </summary>
          <pre className="text-xs mt-2 p-3 rounded-xl whitespace-pre-wrap" style={{ background: "var(--color-cream-2)" }}>
{s.outreachDraft}
          </pre>
        </details>
      )}

      <div className="flex flex-wrap gap-2 mt-4 items-center">
        <form action={draftOutreachAction}>
          <input type="hidden" name="sid" value={s.id} />
          <button className="btn btn-primary btn-sm">✉️ Redactar outreach</button>
        </form>
        <form action={setSupplierStatusAction} className="flex items-center gap-1">
          <input type="hidden" name="sid" value={s.id} />
          <select name="status" defaultValue={s.status} className="field text-xs w-auto capitalize" style={{ padding: "6px 8px" }}>
            {SUPPLIER_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" title="Cambiar estado">✓</button>
        </form>
        <form action={deleteSupplierAction}>
          <input type="hidden" name="sid" value={s.id} />
          <button className="btn btn-ghost btn-sm" title="Eliminar" style={{ color: "var(--color-coral-deep)" }}>✕</button>
        </form>
      </div>
    </div>
  );
}

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
      <p className="text-sm mb-5 mt-1" style={{ color: "var(--color-ink-soft)" }}>{sub}</p>
      {children}
    </section>
  );
}

function Metric({ value, label, accent, href }: { value: string; label: string; accent: string; href?: string }) {
  const inner = (
    <>
      <div className="font-display text-3xl md:text-4xl" style={{ color: accent }}>{value}</div>
      <div className="text-sm font-semibold mt-1" style={{ color: "var(--color-ink-soft)" }}>{label}</div>
    </>
  );
  return href ? (
    <Link href={href} className="card p-5 block hover:-translate-y-0.5 transition-transform">{inner}</Link>
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

function Input({ name, label, placeholder, required }: { name: string; label: string; placeholder?: string; required?: boolean }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} className="field" placeholder={placeholder} required={required} />
    </div>
  );
}
