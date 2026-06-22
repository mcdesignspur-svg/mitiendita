"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

const MAX_MB = 100;

/**
 * Sube un video del producto directo a Vercel Blob (client upload) usando la
 * ruta `/api/admin/upload-video` solo para el token. Soporta archivos grandes
 * (multipart) con barra de progreso, sin pasar por el límite de la función.
 */
export function VideoUploader({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      setError("Selecciona un archivo de video (MP4, WebM, MOV).");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Video muy grande (máx. ${MAX_MB} MB).`);
      return;
    }
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      const safeName = f.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const blob = await upload(`products/videos/${safeName}`, f, {
        access: "public",
        handleUploadUrl: "/api/admin/upload-video",
        multipart: true,
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      onChange(blob.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el video.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="video/*" onChange={pick} className="hidden" />

      {value ? (
        <div className="flex flex-col gap-3">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={value}
            controls
            playsInline
            preload="metadata"
            className="w-full max-w-sm rounded-xl"
            style={{ border: "2px solid var(--color-ink)", background: "#000" }}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn btn-ghost btn-sm"
            >
              Cambiar video
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={uploading}
              className="btn btn-ghost btn-sm"
              style={{ color: "var(--color-coral-deep)" }}
            >
              Quitar video
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-xl py-8 text-center"
          style={{ border: "2px dashed var(--color-line)", background: "var(--color-cream-2)" }}
        >
          <div className="text-3xl mb-1">🎬</div>
          <div className="font-semibold text-sm">Subir video del producto</div>
          <div className="text-xs" style={{ color: "var(--color-muted)" }}>
            MP4, WebM o MOV · máx. {MAX_MB} MB
          </div>
        </button>
      )}

      {uploading && (
        <div className="mt-3">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-cream-2)", border: "1.5px solid var(--color-line)" }}>
            <div
              className="h-full transition-[width] duration-200"
              style={{ width: `${progress}%`, background: "var(--color-grape)" }}
            />
          </div>
          <p className="text-xs mt-1 font-semibold" style={{ color: "var(--color-ink-soft)" }}>
            Subiendo… {progress}%
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm mt-2 font-semibold" style={{ color: "var(--color-coral-deep)" }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
