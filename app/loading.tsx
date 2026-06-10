export default function Loading() {
  return (
    <div className="wrap py-24 text-center" aria-label="Cargando…" role="status">
      <div
        className="inline-block w-12 h-12 rounded-full border-4"
        style={{
          borderColor: "var(--color-line)",
          borderTopColor: "var(--color-coral)",
          animation: "spin 0.7s linear infinite",
        }}
      />
      <p className="mt-4 text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
        Cargando…
      </p>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
