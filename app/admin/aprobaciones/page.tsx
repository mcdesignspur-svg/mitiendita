import Link from "next/link";
import { listApprovalTasks } from "@/lib/db";
import { approveTaskAction, rejectTaskAction } from "@/lib/actions";
import type { ApprovalKind, ApprovalTask } from "@/lib/types";

export const metadata = { title: "Aprobaciones — Mi Tiendita PR" };

const KIND_LABEL: Record<ApprovalKind, string> = {
  candidato: "Candidato",
  outreach: "Outreach",
  orden_compra: "Orden de compra",
  activar_producto: "Activar producto",
  promocion: "Promoción",
  recibo: "Recibo",
  recompra: "Recompra",
};

const AGENT_LABEL: Record<string, string> = {
  hermes: "Hermes",
  chrome: "Chrome ext.",
  operador: "Operador",
  cron: "Cron",
  app: "Panel",
};

function relatedHref(t: ApprovalTask): string | null {
  if (!t.relatedId) return null;
  if (t.relatedType === "product") return `/admin/productos/${t.relatedId}`;
  if (t.relatedType === "purchase_order") return "/admin/compras";
  if (t.relatedType === "campaign") return "/admin/promociones";
  // Deep-link directo al candidato en el pipeline de sourcing (ancla en /admin).
  if (t.relatedType === "candidate") return `/admin#cand-${t.relatedId}`;
  if (t.relatedType === "supplier") return "/admin";
  return null;
}

export default async function AprobacionesPage() {
  const all = await listApprovalTasks();
  const pendientes = all.filter((t) => t.status === "pendiente");
  const decididas = all.filter((t) => t.status !== "pendiente").slice(0, 15);

  return (
    <div className="wrap py-10">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
        <div>
          <span className="eyebrow">Cerebro de control</span>
          <h1 className="font-display text-4xl md:text-5xl mt-2">Aprobaciones ✅</h1>
        </div>
        <Link href="/admin/bitacora" className="btn btn-ghost btn-sm">Ver bitácora →</Link>
      </div>
      <p className="text-sm mb-8" style={{ color: "var(--color-ink-soft)" }}>
        Cada gate de dinero, contacto externo o publicación espera tu OK. Lo que apruebes se ejecuta
        y, si toca, se encola para que Hermes lo haga en Alibaba.
      </p>

      {pendientes.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: "var(--color-muted)" }}>
          No hay nada pendiente. 🎉 Todo al día.
        </div>
      ) : (
        <div className="space-y-3">
          {pendientes.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge badge-nuevo">{KIND_LABEL[t.kind] ?? t.kind}</span>
                    <span className="text-xs" style={{ color: "var(--color-muted)" }}>
                      por {AGENT_LABEL[t.createdBy] ?? t.createdBy}
                    </span>
                  </div>
                  <h3 className="font-display text-lg mt-2 leading-tight">{t.title}</h3>
                  {t.summary && <p className="text-sm mt-1" style={{ color: "var(--color-ink-soft)" }}>{t.summary}</p>}
                  {relatedHref(t) && (
                    <Link href={relatedHref(t)!} className="text-xs font-semibold" style={{ color: "var(--color-grape)" }}>
                      Ver detalle →
                    </Link>
                  )}
                  {t.payload?.body ? (
                    <details className="mt-3">
                      <summary className="text-sm font-semibold cursor-pointer" style={{ color: "var(--color-grape)" }}>
                        ✉️ Ver mensaje
                      </summary>
                      <pre className="text-xs mt-2 p-3 rounded-xl whitespace-pre-wrap" style={{ background: "var(--color-cream-2)" }}>
{String(t.payload.subject ? `Asunto: ${t.payload.subject}\n\n` : "")}{String(t.payload.body)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 items-center">
                <form action={approveTaskAction} className="flex items-center gap-2 flex-1 min-w-[240px]">
                  <input type="hidden" name="tid" value={t.id} />
                  <input name="note" className="field text-sm flex-1" placeholder="Nota (opcional)" />
                  <button className="btn btn-primary btn-sm">✓ Aprobar</button>
                </form>
                <form action={rejectTaskAction}>
                  <input type="hidden" name="tid" value={t.id} />
                  <button className="btn btn-ghost btn-sm" style={{ color: "var(--color-coral-deep)" }}>✕ Rechazar</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      {decididas.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl">Decisiones recientes</h2>
          <div className="space-y-2 mt-4">
            {decididas.map((t) => (
              <div key={t.id} className="card-flat px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <span className={`badge ${t.status === "aprobada" ? "badge-soft" : ""} mr-2`}
                    style={t.status === "rechazada" ? { background: "#ffe0d8", color: "var(--color-coral-deep)" } : undefined}>
                    {t.status}
                  </span>
                  <span className="text-sm font-semibold">{t.title}</span>
                  {t.decisionNote && (
                    <span className="text-xs ml-2" style={{ color: "var(--color-muted)" }}>“{t.decisionNote}”</span>
                  )}
                </div>
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>{KIND_LABEL[t.kind] ?? t.kind}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
