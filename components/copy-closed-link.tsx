"use client";

import { useState } from "react";

/**
 * Copia al portapapeles el link cerrado de un producto
 * (`<origen>/exclusivo/<slug>`): un enlace privado que abre SOLO ese producto,
 * sin navegación al resto de la tienda. El origen se toma del navegador para
 * que funcione igual en local y en producción.
 */
export function CopyClosedLink({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/exclusivo/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copia el link cerrado:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="btn btn-ghost btn-sm"
      title="Copiar link cerrado (solo este producto)"
    >
      {copied ? "✓ Copiado" : "🔒 Link cerrado"}
    </button>
  );
}
