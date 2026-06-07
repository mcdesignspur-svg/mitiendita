"use client";

import { useState } from "react";

/** Botón para copiar el prompt de la extensión + vista plegable del texto. */
export function CopyPrompt({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback para contextos sin Clipboard API.
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch { /* noop */ }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <button type="button" onClick={copy} className="btn btn-primary btn-sm">
          {copied ? "✓ Copiado" : "📋 Copiar prompt para la extensión"}
        </button>
        <span className="text-xs" style={{ color: "var(--color-muted)" }}>
          Pégalo como tarea en el sidebar de Claude-en-Chrome.
        </span>
      </div>
      <details className="mt-3">
        <summary className="text-sm font-semibold cursor-pointer" style={{ color: "var(--color-grape)" }}>
          Ver el prompt
        </summary>
        <pre className="text-xs mt-2 p-3 rounded-xl whitespace-pre-wrap" style={{ background: "var(--color-cream-2)", maxHeight: "20rem", overflow: "auto" }}>
{text}
        </pre>
      </details>
    </div>
  );
}
