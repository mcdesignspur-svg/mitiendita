"use client";

import { useActionState, useState } from "react";
import { generateCopyAction, type CopyState } from "@/lib/actions";

export function CopyStudio({
  products,
}: {
  products: { name: string; category: string }[];
}) {
  const [idx, setIdx] = useState(0);
  const [state, action, pending] = useActionState<CopyState, FormData>(
    generateCopyAction,
    {},
  );
  const selected = products[idx] ?? { name: "", category: "General" };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <form action={action} className="card p-5">
        <label className="label" htmlFor="product">Producto</label>
        <select
          id="product"
          className="field mb-4"
          value={idx}
          onChange={(e) => setIdx(Number(e.target.value))}
        >
          {products.map((p, i) => (
            <option key={p.id} value={i}>{p.name}</option>
          ))}
        </select>

        <input type="hidden" name="name" value={selected.name} />
        <input type="hidden" name="category" value={selected.category} />

        <label className="label" htmlFor="audience">Audiencia</label>
        <input
          id="audience"
          name="audience"
          className="field mb-4"
          defaultValue="dueños de carro en Puerto Rico"
          placeholder="¿Para quién?"
        />

        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "Generando…" : "✨ Generar copy de marketing"}
        </button>
        <p className="text-xs mt-3" style={{ color: "var(--color-muted)" }}>
          Usa Vercel AI Gateway si hay <code>AI_GATEWAY_API_KEY</code>; si no, plantilla local.
        </p>
      </form>

      <div className="card p-5">
        {state.error && (
          <p className="text-sm font-semibold" style={{ color: "var(--color-coral-deep)" }}>⚠ {state.error}</p>
        )}
        {!state.result && !state.error && (
          <div className="h-full grid place-items-center text-center" style={{ color: "var(--color-muted)" }}>
            <div>
              <div className="text-4xl mb-2">📣</div>
              <p className="text-sm">El copy generado aparecerá aquí.</p>
            </div>
          </div>
        )}
        {state.result && (
          <div>
            <span className="badge badge-soft mb-3">
              {state.result.source === "ai" ? "🤖 Generado con AI" : "📝 Plantilla local"}
            </span>
            <h3 className="font-display text-xl mb-2">{state.result.headline}</h3>
            <p className="text-sm mb-3 p-3 rounded-xl" style={{ background: "var(--color-cream-2)" }}>
              {state.result.caption}
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {state.result.hashtags.map((h) => (
                <span key={h} className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: "#eef4ff", color: "var(--color-grape)" }}>
                  {h}
                </span>
              ))}
            </div>
            <ul className="space-y-1 text-sm">
              {state.result.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span style={{ color: "var(--color-teal)" }}>●</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
