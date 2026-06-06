"use client";

import { useActionState } from "react";
import {
  approveBusinessAction,
  rejectBusinessAction,
  assessBusinessAction,
  type AssessState,
} from "@/lib/actions";

const TYPE_LABEL: Record<string, string> = {
  gasolinera: "Gasolinera",
  farmacia: "Farmacia",
  minimarket: "Mini-market",
  colmado: "Colmado",
  otro: "Otro comercio",
};

const REC_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  aprobar: { label: "✓ Aprobar", color: "#0a7d72", bg: "#e6f7f4" },
  revisar: { label: "⚠ Revisar", color: "#9a6a00", bg: "#fff6e0" },
  rechazar: { label: "✕ Rechazar", color: "var(--color-coral-deep)", bg: "#ffe9e4" },
};

export interface PendingBusiness {
  id: string;
  businessName: string;
  type: string;
  contactName: string;
  municipio: string;
  registroComerciante: string;
}

export function VerificationCopilot({ business }: { business: PendingBusiness }) {
  const [state, analyze, pending] = useActionState<AssessState, FormData>(
    assessBusinessAction,
    {},
  );
  const a = state.assessment;
  const rec = a ? REC_STYLE[a.recommendation] ?? REC_STYLE.revisar : null;

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="min-w-0">
          <div className="font-display text-lg">{business.businessName}</div>
          <div className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            {TYPE_LABEL[business.type] ?? business.type} · {business.municipio} · {business.contactName}
          </div>
          <div className="text-sm mt-1">
            <span className="font-semibold">Registro:</span>{" "}
            <span style={{ color: "var(--color-coral-deep)" }}>{business.registroComerciante}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <form action={analyze}>
            <input type="hidden" name="bid" value={business.id} />
            <button className="btn btn-ghost btn-sm" disabled={pending}>
              {pending ? "Analizando…" : "🤖 Analizar"}
            </button>
          </form>
          <form action={approveBusinessAction}>
            <input type="hidden" name="bid" value={business.id} />
            <button className="btn btn-primary btn-sm">✓ Aprobar</button>
          </form>
          <form action={rejectBusinessAction}>
            <input type="hidden" name="bid" value={business.id} />
            <button className="btn btn-ghost btn-sm">Rechazar</button>
          </form>
        </div>
      </div>

      {state.error && (
        <p className="text-sm mt-3 font-semibold" style={{ color: "var(--color-coral-deep)" }}>
          ⚠ {state.error}
        </p>
      )}

      {a && rec && (
        <div className="mt-4 rounded-xl p-3" style={{ background: "var(--color-cream-2)" }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="badge"
              style={{ background: rec.bg, color: rec.color, borderColor: rec.color }}
            >
              {rec.label}
            </span>
            <span className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>
              confianza {a.confidence}% · {a.source === "ai" ? "🤖 AI" : "heurística"}
            </span>
          </div>
          {a.reasons.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {a.reasons.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span style={{ color: "var(--color-teal)" }}>●</span>
                  {r}
                </li>
              ))}
            </ul>
          )}
          {a.flags.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm">
              {a.flags.map((f, i) => (
                <li key={i} className="flex gap-2" style={{ color: "var(--color-coral-deep)" }}>
                  <span>⚠</span>
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
