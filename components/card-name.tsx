"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * Nombre del producto en la tarjeta del catálogo. Se trunca a 2 líneas; si el
 * nombre NO cabe, tocarlo abre un drawer (bottom sheet) con el nombre completo
 * en vez de navegar. Si cabe, funciona como link normal al producto.
 */
export function CardName({ name, slug }: { name: string; slug: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [truncated, setTruncated] = useState(false);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);

  // Detecta si el texto se cortó (alto real > alto visible con el clamp).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setTruncated(el.scrollHeight - el.clientHeight > 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [name]);

  // Bloquea el scroll del fondo mientras el drawer está abierto + animación.
  useEffect(() => {
    if (!open) return;
    setShown(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    setShown(false);
    setTimeout(() => setOpen(false), 180);
  }

  return (
    <>
      <Link
        href={`/productos/${slug}`}
        onClick={(e) => {
          if (truncated) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <h3
          ref={ref}
          className="font-display text-lg leading-tight mt-1 mb-1 line-clamp-2 hover:underline"
        >
          {name}
        </h3>
      </Link>

      {open && (
        <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Nombre del producto">
          {/* backdrop */}
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            className="absolute inset-0 transition-opacity duration-200"
            style={{ background: "rgba(0,0,0,0.45)", opacity: shown ? 1 : 0 }}
          />
          {/* bottom sheet */}
          <div
            className="absolute inset-x-0 bottom-0 px-6 pt-3 pb-7 transition-transform duration-200"
            style={{
              background: "var(--color-cream)",
              borderTop: "2px solid var(--color-ink)",
              borderTopLeftRadius: "1.25rem",
              borderTopRightRadius: "1.25rem",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.18)",
              transform: shown ? "translateY(0)" : "translateY(100%)",
            }}
          >
            <div
              className="mx-auto w-10 h-1.5 rounded-full mb-5"
              style={{ background: "var(--color-line)" }}
            />
            <span
              className="text-[11px] font-bold uppercase tracking-wide"
              style={{ color: "var(--color-teal-deep)" }}
            >
              Producto
            </span>
            <h2 className="font-display text-2xl leading-snug mt-1 mb-5">{name}</h2>
            <div className="flex gap-2">
              <Link href={`/productos/${slug}`} className="btn btn-primary flex-1">
                Ver producto →
              </Link>
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
