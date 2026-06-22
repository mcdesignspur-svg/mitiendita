"use client";

import { useRef, useState } from "react";

type Media = { kind: "video"; src: string } | { kind: "image"; src: string };

/**
 * Carrusel de medios del producto (página de detalle). Si hay video, va como
 * primer slide (con miniatura ▶). Luego las fotos. Si solo hay una foto, la
 * muestra sin controles; si no hay nada, cae al gradient + emoji.
 */
export function ProductGallery({
  images,
  videoUrl,
  gradient,
  emoji,
  name,
}: {
  images: string[];
  videoUrl?: string;
  gradient: string;
  emoji: string;
  name: string;
}) {
  const [i, setI] = useState(0);
  const touch = useRef<number | null>(null);

  const media: Media[] = [
    ...(videoUrl ? [{ kind: "video" as const, src: videoUrl }] : []),
    ...images.map((src) => ({ kind: "image" as const, src })),
  ];
  const poster = images[0];

  const count = media.length;
  const idx = Math.min(i, Math.max(0, count - 1));
  const active = media[idx];

  function go(n: number) {
    if (count === 0) return;
    setI((n + count) % count);
  }

  // --- Sin medios: fallback gradient + emoji ---
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
        style={{ background: active.kind === "video" ? "#000" : gradient }}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current === null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(idx + (dx < 0 ? 1 : -1));
          touch.current = null;
        }}
      >
        {active.kind === "video" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            key={active.src}
            src={active.src}
            poster={poster || undefined}
            controls
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={active.src}
            src={active.src}
            alt={`${name} — foto ${idx + 1}`}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(idx - 1)}
              aria-label="Anterior"
              className="absolute left-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full shadow-lg text-lg font-bold transition-transform hover:scale-110 z-10"
              style={{ background: "rgba(255,255,255,0.9)", color: "var(--color-ink)" }}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(idx + 1)}
              aria-label="Siguiente"
              className="absolute right-3 top-1/2 -translate-y-1/2 grid place-items-center w-10 h-10 rounded-full shadow-lg text-lg font-bold transition-transform hover:scale-110 z-10"
              style={{ background: "rgba(255,255,255,0.9)", color: "var(--color-ink)" }}
            >
              ›
            </button>

            {/* Los puntos se ocultan en el slide de video para no taparle los
                controles nativos del reproductor (que viven abajo). */}
            {active.kind !== "video" && (
              <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
                {media.map((_, n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setI(n)}
                    aria-label={`Ir al medio ${n + 1}`}
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: n === idx ? 20 : 8,
                      background: n === idx ? "var(--color-ink)" : "rgba(255,255,255,0.75)",
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          {media.map((m, n) => (
            <button
              key={m.src + n}
              type="button"
              onClick={() => setI(n)}
              aria-label={m.kind === "video" ? "Video" : `Foto ${n + 1}`}
              className="shrink-0 rounded-xl overflow-hidden transition-transform relative"
              style={{
                border: n === idx ? "3px solid var(--color-ink)" : "2px solid var(--color-line)",
                opacity: n === idx ? 1 : 0.7,
              }}
            >
              {m.kind === "video" ? (
                <span className="grid place-items-center w-16 h-16" style={{ background: "#000" }}>
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
                  ) : null}
                  <span className="relative grid place-items-center w-7 h-7 rounded-full text-xs" style={{ background: "rgba(255,255,255,0.92)", color: "var(--color-ink)" }}>
                    ▶
                  </span>
                </span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.src} alt={`${name} miniatura ${n + 1}`} className="w-16 h-16 object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
