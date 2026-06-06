import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap py-24 text-center max-w-md">
      <div className="text-6xl mb-4">🧭</div>
      <h1 className="font-display text-5xl mb-3">Página no encontrada</h1>
      <p className="mb-7" style={{ color: "var(--color-ink-soft)" }}>
        Esta página se fue de viaje. Vuelve al catálogo a seguir comprando lo viral.
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/" className="btn btn-primary">Inicio</Link>
        <Link href="/productos" className="btn btn-ghost">Ver catálogo</Link>
      </div>
    </div>
  );
}
