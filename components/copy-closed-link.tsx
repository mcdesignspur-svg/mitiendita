"use client";

import { useEffect, useState } from "react";

/**
 * Abre un preview del link cerrado (`<origen>/exclusivo/<slug>`) antes de
 * copiarlo: enlace privado que muestra SOLO ese producto, sin navegación al
 * resto de la tienda. El origen se toma del navegador para que funcione igual
 * en local y en producción.
 */
export function CopyClosedLink({
  slug,
  productName,
}: {
  slug: string;
  productName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    setShown(true);
    setUrl(`${window.location.origin}/exclusivo/${slug}`);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, slug]);

  function close() {
    setShown(false);
    setCopied(false);
    setTimeout(() => setOpen(false), 180);
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copia el link cerrado:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-sm"
        title="Ver y copiar link cerrado (solo este producto)"
      >
        🔒 Link cerrado
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="closed-link-title"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            className="absolute inset-0 transition-opacity duration-200"
            style={{ background: "rgba(0,0,0,0.45)", opacity: shown ? 1 : 0 }}
          />
          <div
            className="relative w-full max-w-lg card p-6 transition-all duration-200"
            style={{
              opacity: shown ? 1 : 0,
              transform: shown ? "scale(1)" : "scale(0.97)",
            }}
          >
            <span
              className="text-[11px] font-bold uppercase tracking-wide"
              style={{ color: "var(--color-teal-deep)" }}
            >
              🔒 Link cerrado
            </span>
            <h2 id="closed-link-title" className="font-display text-2xl mt-1 mb-1">
              {productName ?? "Venta rápida"}
            </h2>
            <p className="text-sm mb-4" style={{ color: "var(--color-ink-soft)" }}>
              Este enlace abre <strong>solo este producto</strong> — sin catálogo, carrito ni menú.
              Ideal para enviar por WhatsApp, SMS o redes.
            </p>

            <label className="label" htmlFor={`closed-link-${slug}`}>
              URL del enlace
            </label>
            <input
              id={`closed-link-${slug}`}
              readOnly
              value={url}
              onFocus={(e) => e.target.select()}
              className="field mb-4 font-mono text-xs"
              style={{ color: "var(--color-ink)" }}
            />

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copy} className="btn btn-primary flex-1 min-w-[8rem]">
                {copied ? "✓ Copiado" : "Copiar link"}
              </button>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                >
                  Abrir ↗
                </a>
              )}
              <button type="button" onClick={close} className="btn btn-ghost">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
