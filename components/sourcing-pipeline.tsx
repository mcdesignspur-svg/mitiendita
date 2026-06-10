"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { money, pct } from "@/lib/format";
import {
  setCandidateStageAction,
  deleteCandidateAction,
  promoteCandidateAction,
} from "@/lib/actions";
import { safeUrl } from "@/lib/url-safe";
import type { SourcingCandidate } from "@/lib/types";

type Candidate = SourcingCandidate & { score: number };
type View = "cards" | "list";
const VIEW_KEY = "mt_sourcing_view";

const STAGE_COLOR: Record<string, string> = {
  Detectado: "var(--color-muted)",
  Evaluando: "var(--color-grape)",
  Negociando: "var(--color-coral)",
  Ordenado: "var(--color-teal-deep)",
  Descartado: "var(--color-ink-soft)",
};
const STAGES = ["Detectado", "Evaluando", "Negociando", "Ordenado", "Descartado"];

export function SourcingPipeline({ candidates }: { candidates: Candidate[] }) {
  const [view, setView] = useState<View>("cards");

  // Restaura la preferencia guardada (evita hydration mismatch leyendo en effect).
  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "cards" || saved === "list") setView(saved);
  }, []);

  function changeView(v: View) {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  }

  if (candidates.length === 0) {
    return (
      <p style={{ color: "var(--color-muted)" }}>
        Aún no hay candidatos. Usa “Descubrir” o corre <code>npm run operator -- ingest</code>.
      </p>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <p className="text-sm" style={{ color: "var(--color-muted)" }}>
          {candidates.length} candidato{candidates.length === 1 ? "" : "s"} · ordenados por score
        </p>
        <ViewToggle view={view} onChange={changeView} />
      </div>

      {view === "cards" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {candidates.map((c) => (
            <CandidateCard key={c.id} c={c} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {candidates.map((c) => (
            <CandidateRow key={c.id} c={c} />
          ))}
        </div>
      )}
    </>
  );
}

function ViewToggle({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div
      className="inline-flex rounded-full p-1 gap-1"
      style={{ background: "var(--color-cream-2)" }}
      role="group"
      aria-label="Cambiar vista"
    >
      <ToggleBtn active={view === "cards"} onClick={() => onChange("cards")} label="Tarjetas">
        ▦
      </ToggleBtn>
      <ToggleBtn active={view === "list"} onClick={() => onChange("list")} label="Lista">
        ☰
      </ToggleBtn>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
      style={{
        background: active ? "var(--color-ink)" : "transparent",
        color: active ? "#fff" : "var(--color-ink-soft)",
      }}
    >
      <span aria-hidden>{children}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--color-cream-2)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: score > 70 ? "var(--color-teal)" : "var(--color-sun)" }}
        />
      </div>
      <span className="font-display text-lg tabular-nums">{score}</span>
    </div>
  );
}

function StageControls({ c }: { c: Candidate }) {
  return (
    <>
      {c.productId ? (
        <Link href={`/admin/productos/${c.productId}`} className="btn btn-ghost btn-sm">
          Ver producto →
        </Link>
      ) : (
        <form action={promoteCandidateAction}>
          <input type="hidden" name="cid" value={c.id} />
          <button className="btn btn-primary btn-sm">→ Crear producto</button>
        </form>
      )}
      <form action={setCandidateStageAction} className="flex items-center gap-1">
        <input type="hidden" name="cid" value={c.id} />
        <select name="stage" defaultValue={c.stage} className="field text-xs w-auto" style={{ padding: "6px 8px" }}>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm" title="Cambiar etapa">
          ✓
        </button>
      </form>
      <form action={deleteCandidateAction}>
        <input type="hidden" name="cid" value={c.id} />
        <button className="btn btn-ghost btn-sm" title="Eliminar" style={{ color: "var(--color-coral-deep)" }}>
          ✕
        </button>
      </form>
    </>
  );
}

function CandidateCard({ c }: { c: Candidate }) {
  const margin = c.estRetail > 0 ? (c.estRetail - c.unitCost) / c.estRetail : 0;
  return (
    <div id={`cand-${c.id}`} className="card p-5" style={{ scrollMarginTop: "5rem" }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-3xl">{c.emoji}</span>
        <div className="flex flex-col items-end gap-1">
          <span
            className="badge"
            style={{ background: STAGE_COLOR[c.stage], color: "#fff", borderColor: "var(--color-ink)" }}
          >
            {c.stage}
          </span>
          {(c.origin === "agente" || c.origin === "app") && (
            <span className="text-[10px] font-semibold" style={{ color: "var(--color-grape)" }}>
              🤖 agente
            </span>
          )}
        </div>
      </div>
      <h3 className="font-display text-lg leading-tight mb-1">{c.name}</h3>
      <p className="text-xs mb-3" style={{ color: "var(--color-muted)" }}>
        {c.supplier || "sin suplidor"}
      </p>

      <div className="mb-3">
        <ScoreBadge score={c.score} />
      </div>

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <Mini label="Costo" value={money(c.unitCost)} />
        <Mini label="Retail" value={money(c.estRetail)} />
        <Mini label="Margen" value={pct(margin)} />
      </div>
      <p className="text-xs mt-3 font-semibold" style={{ color: "var(--color-teal-deep)" }}>
        📈 {c.signal}
      </p>
      {safeUrl(c.sourceUrl) ? (
        <a
          href={safeUrl(c.sourceUrl)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold inline-flex items-center gap-1 mt-2 hover:underline"
          style={{ color: "var(--color-grape)" }}
        >
          🔗 Ver en Alibaba
        </a>
      ) : (
        <span
          className="text-xs font-semibold inline-flex items-center gap-1 mt-2"
          style={{ color: "var(--color-coral-deep)" }}
          title="Este candidato llegó sin enlace directo al producto"
        >
          ⚠️ sin enlace directo
        </span>
      )}

      <div className="flex flex-wrap gap-2 mt-4 items-center">
        <StageControls c={c} />
      </div>
    </div>
  );
}

function CandidateRow({ c }: { c: Candidate }) {
  const margin = c.estRetail > 0 ? (c.estRetail - c.unitCost) / c.estRetail : 0;
  return (
    <div id={`cand-${c.id}`} className="card-flat px-4 py-3 flex items-center gap-4 flex-wrap" style={{ scrollMarginTop: "5rem" }}>
      <span className="text-2xl shrink-0">{c.emoji}</span>

      <div className="min-w-0 flex-1" style={{ flexBasis: "14rem" }}>
        <div className="flex items-center gap-2">
          <h3 className="font-display text-base leading-tight truncate">{c.name}</h3>
          {(c.origin === "agente" || c.origin === "app") && (
            <span className="text-[10px] font-semibold shrink-0" style={{ color: "var(--color-grape)" }}>
              🤖
            </span>
          )}
        </div>
        <p className="text-xs truncate" style={{ color: "var(--color-muted)" }}>
          {c.supplier || "sin suplidor"} · <span style={{ color: "var(--color-teal-deep)" }}>📈 {c.signal}</span>
          {" · "}
          {safeUrl(c.sourceUrl) ? (
            <a href={safeUrl(c.sourceUrl)} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: "var(--color-grape)" }}>
              🔗 Alibaba
            </a>
          ) : (
            <span className="font-semibold" style={{ color: "var(--color-coral-deep)" }}>⚠️ sin enlace</span>
          )}
        </p>
      </div>

      <span
        className="badge shrink-0"
        style={{ background: STAGE_COLOR[c.stage], color: "#fff", borderColor: "var(--color-ink)" }}
      >
        {c.stage}
      </span>

      <div className="w-28 shrink-0">
        <ScoreBadge score={c.score} />
      </div>

      <div className="hidden md:flex items-center gap-4 text-xs shrink-0">
        <RowMetric label="Costo" value={money(c.unitCost)} />
        <RowMetric label="Retail" value={money(c.estRetail)} />
        <RowMetric label="Margen" value={pct(margin)} />
      </div>

      <div className="flex flex-wrap gap-2 items-center ml-auto">
        <StageControls c={c} />
      </div>
    </div>
  );
}

function RowMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        {label}
      </div>
      <div className="font-bold">{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg py-1.5" style={{ background: "var(--color-cream-2)" }}>
      <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>
        {label}
      </div>
      <div className="font-bold text-sm">{value}</div>
    </div>
  );
}
