"use client";

import { useRef, useState } from "react";

const FRAME = 300; // tamaño del recuadro de recorte en px
const OUT = 1000; // tamaño de salida (cuadrado) en px

export function ImageEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  function baseScale(im: HTMLImageElement) {
    return Math.max(FRAME / im.naturalWidth, FRAME / im.naturalHeight);
  }
  function dims(im: HTMLImageElement, z: number) {
    const s = baseScale(im) * z;
    return { s, dw: im.naturalWidth * s, dh: im.naturalHeight * s };
  }
  function clamp(o: { x: number; y: number }, dw: number, dh: number) {
    return {
      x: Math.min(0, Math.max(FRAME - dw, o.x)),
      y: Math.min(0, Math.max(FRAME - dh, o.y)),
    };
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setError("Selecciona un archivo de imagen.");
      return;
    }
    setError(null);
    const url = URL.createObjectURL(f);
    const im = new Image();
    im.onload = () => {
      setImg(im);
      setSrc(url);
      setZoom(1);
      const { dw, dh } = dims(im, 1);
      setOffset({ x: (FRAME - dw) / 2, y: (FRAME - dh) / 2 });
    };
    im.onerror = () => setError("No se pudo cargar la imagen.");
    im.src = url;
    e.target.value = "";
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!img) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !img) return;
    const { dw, dh } = dims(img, zoom);
    setOffset(
      clamp(
        { x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) },
        dw,
        dh,
      ),
    );
  }
  function onPointerUp() {
    drag.current = null;
  }

  function changeZoom(z: number) {
    if (!img) return;
    const center = { x: FRAME / 2 - offset.x, y: FRAME / 2 - offset.y };
    const prev = dims(img, zoom).s;
    const next = dims(img, z).s;
    const ratio = next / prev;
    const no = { x: FRAME / 2 - center.x * ratio, y: FRAME / 2 - center.y * ratio };
    const { dw, dh } = dims(img, z);
    setZoom(z);
    setOffset(clamp(no, dw, dh));
  }

  async function save() {
    if (!img) return;
    setUploading(true);
    setError(null);
    try {
      const { s } = dims(img, zoom);
      const sx = -offset.x / s;
      const sy = -offset.y / s;
      const sw = FRAME / s;
      const sh = FRAME / s;
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible.");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUT, OUT);
      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob(res, "image/jpeg", 0.85),
      );
      if (!blob) throw new Error("No se pudo procesar la imagen.");
      const fd = new FormData();
      fd.append("file", blob, "product.jpg");
      const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Error al subir.");
      onChange(data.url);
      cleanup();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  function cleanup() {
    if (src) URL.revokeObjectURL(src);
    setSrc(null);
    setImg(null);
  }

  // --- Render ---------------------------------------------------
  if (src && img) {
    const { dw, dh } = dims(img, zoom);
    return (
      <div>
        <div
          className="relative mx-auto overflow-hidden rounded-xl touch-none select-none"
          style={{ width: FRAME, height: FRAME, border: "2px solid var(--color-ink)", cursor: "grab", background: "#000" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="recorte"
            draggable={false}
            style={{ position: "absolute", left: offset.x, top: offset.y, width: dw, height: dh, maxWidth: "none" }}
          />
          <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset 0 0 0 9999px rgba(0,0,0,0)" }} />
        </div>

        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs font-semibold" style={{ color: "var(--color-muted)" }}>Zoom</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => changeZoom(Number(e.target.value))}
            className="flex-1"
          />
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>
          Arrastra para encuadrar · se guarda en cuadrado (1000×1000).
        </p>

        {error && <p className="text-sm mt-2 font-semibold" style={{ color: "var(--color-coral-deep)" }}>⚠ {error}</p>}

        <div className="flex gap-2 mt-3">
          <button type="button" onClick={save} disabled={uploading} className="btn btn-primary btn-sm">
            {uploading ? "Subiendo…" : "Guardar imagen"}
          </button>
          <button type="button" onClick={cleanup} disabled={uploading} className="btn btn-ghost btn-sm">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
      {value ? (
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="producto"
            className="w-24 h-24 rounded-xl object-cover"
            style={{ border: "2px solid var(--color-ink)" }}
          />
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost btn-sm">
              Cambiar imagen
            </button>
            <button type="button" onClick={() => onChange("")} className="btn btn-ghost btn-sm" style={{ color: "var(--color-coral-deep)" }}>
              Quitar imagen
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-xl py-8 text-center"
          style={{ border: "2px dashed var(--color-line)", background: "var(--color-cream-2)" }}
        >
          <div className="text-3xl mb-1">🖼️</div>
          <div className="font-semibold text-sm">Subir imagen del producto</div>
          <div className="text-xs" style={{ color: "var(--color-muted)" }}>JPG o PNG · se recorta a cuadrado</div>
        </button>
      )}
      {error && <p className="text-sm mt-2 font-semibold" style={{ color: "var(--color-coral-deep)" }}>⚠ {error}</p>}
    </div>
  );
}
