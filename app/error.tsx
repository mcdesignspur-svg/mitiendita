"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Loguear el error en producción (sin exponerlo en UI)
    console.error(error);
  }, [error]);

  return (
    <div className="wrap py-24 text-center">
      <div className="text-6xl mb-6">⚠️</div>
      <h1 className="font-display text-3xl md:text-4xl mb-3">Algo salió mal</h1>
      <p className="text-base mb-8 max-w-md mx-auto" style={{ color: "var(--color-ink-soft)" }}>
        Ocurrió un error inesperado. Puedes intentar de nuevo o regresar al inicio.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={reset} className="btn btn-primary">
          Intentar de nuevo
        </button>
        <Link href="/" className="btn btn-ghost">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
