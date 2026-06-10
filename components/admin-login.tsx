"use client";

import { useActionState } from "react";
import { adminLoginAction, type FormState } from "@/lib/actions";

export function AdminLogin({ showDemo = false }: { showDemo?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    adminLoginAction,
    {},
  );

  return (
    <div className="wrap py-20 max-w-sm">
      <div className="text-center mb-6">
        <span className="eyebrow">Operación</span>
        <h1 className="font-display text-4xl mt-2">Panel de operación 🔒</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--color-ink-soft)" }}>
          Acceso restringido al equipo de operación.
        </p>
      </div>
      <form action={action} className="card p-6">
        <label className="label" htmlFor="password">Contraseña de admin</label>
        <input id="password" name="password" type="password" className="field" placeholder="••••••••" required />
        {state.error && (
          <p className="text-sm mt-3 font-semibold" style={{ color: "var(--color-coral-deep)" }}>⚠ {state.error}</p>
        )}
        <button type="submit" disabled={pending} className="btn btn-ink w-full mt-5">
          {pending ? "Entrando…" : "Entrar"}
        </button>
        {showDemo && (
          <p className="text-xs mt-3 text-center" style={{ color: "var(--color-muted)" }}>
            Demo: contraseña <strong>admin</strong> (configurable con ADMIN_PASSWORD).
          </p>
        )}
      </form>
    </div>
  );
}
