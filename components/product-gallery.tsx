"use client";

import { useRef, useState } from "react";

/**
 * Carrusel de fotos del producto (página de detalle). Si solo hay una foto,
 * la muestra sin controles; si no hay ninguna, cae al gradient + emoji.
 */
export function ProductGallery({
  images,
  gradient,
  emoji,
  name,
}: {
  images: string[];
  gradient: string;
  emoji: string;
  name: string;
}) {
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);

  const count = images.length;
  const idx = Math.min(i, Math.max(0, count - 1));

  function go(n: number) {
    if (count === 0) return;
    setI((n + count) % count);
  }

  // --- Sin fotos: fallback gradient + emoji ---
  if (count === 0) {
    return (
      <div className="card aspect-square overflow-hidden relative" style={{ background: gradient }}>
        <span className="absolute inset-0 grid place-items-center text-[10rem] drop-shadow-xl">{emoji}</span>
      </div>
    );
  }

  return (
    <div>
      <div
        className="card aspect-square overflow-hidden relative select-none"
        style={{ background: gradient }}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={images[idx]}
          src={images[idx]}
          alt={`${name} — foto ${idx + 1}`}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(idx - 1)}
              aria-label="Foto anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full shadow-lg text-lg font-bold transition-transform hover:scale-110"
              style={{ background: "rgba(255,255,255,0.9)", color: "var(--color-ink)" }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(idx + 1)}
              aria-label="Foto siguiente"
              className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full shadow-lg text-lg font-bold transition-transform hover:scale-110"
              style={{ background: "rgba(255,255,255,0.9)", color: "var(--color-ink)" }}
            >
              ›
            </button>

            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
              {images.map((_, n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setI(n)}
                  aria-label={`Ir a foto ${n + 1}`}
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: n === idx ? 20 : 8,
                    background: n === idx ? "var(--color-ink)" : "rgba(255,255,255,0.75)",
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {images.map((url, n) => (
            <button
              key={url + n}
              type="button"
              onClick={() => setI(n)}
              aria-label={`Foto ${n + 1}`}
              className="shrink-0 rounded-xl overflow-hidden transition-transform"
              style={{
                border: n === idx ? "3px solid var(--color-ink)" : "2px solid var(--color-line)",
                opacity: n === idx ? 1 : 0.7,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${name} miniatura ${n + 1}`} className="w-16 h-16 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
