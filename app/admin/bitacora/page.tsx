import Link from "next/link";
import { listAgentRuns } from "@/lib/db";

export const metadata = { title: "Bitácora — Mi Tiendita PR" };

const AGENT_LABEL: Record<string, string> = {
  chrome: "Chrome ext.",
  operador: "Operador",
  cron: "Cron",
  app: "Panel",
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  ok: { background: "var(--color-cream-2)", color: "var(--color-ink-soft)" },
  error: { background: "#ffe0d8", color: "var(--color-coral-deep)" },
  parcial: { background: "#fff6e0", color: "#9a7b1f" },
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return `hace ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.round(h / 24)}d`;
}

export default async function BitacoraPage() {
  const runs = await listAgentRuns(80);

  return (
    <div className="wrap py-10">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
        <div>
          <span className="eyebrow">Cerebro de control</span>
          <h1 className="font-display text-4xl md:text-5xl mt-2">Bitácora 📓</h1>
        </div>
        <Link href="/admin/aprobaciones" className="btn btn-ghost btn-sm">Ver aprobaciones →</Link>
      </div>
      <p className="text-sm mb-8" style={{ color: "var(--color-ink-soft)" }}>
        Rastro de lo que hicieron los agentes y crons. Nada corre a ciegas.
      </p>

      {runs.length === 0 ? (
        <div className="card p-8 text-center" style={{ color: "var(--color-muted)" }}>
          Aún no hay actividad registrada.
        </div>
      ) : (
        <div className="space-y-2">
          {runs.map((r) => (
            <div key={r.id} className="card-flat px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex items-center gap-2 flex-wrap">
                <span className="badge badge-soft">{AGENT_LABEL[r.agent] ?? r.agent}</span>
                <span className="badge" style={STATUS_STYLE[r.status] ?? STATUS_STYLE.ok}>{r.status}</span>
                <span className="font-mono text-xs" style={{ color: "var(--color-grape)" }}>{r.action}</span>
                <span className="text-sm">{r.summary}</span>
              </div>
              <span className="text-xs whitespace-nowrap" style={{ color: "var(--color-muted)" }}>{timeAgo(r.createdAt)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
