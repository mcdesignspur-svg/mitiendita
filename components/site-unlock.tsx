"use client";

import { useActionState } from "react";
import { unlockSiteAction, type FormState } from "@/lib/actions";

/**
 * Página de contraseña del candado del sitio. Desbloquea el sitio principal con
 * la contraseña (misma que ADMIN_PASSWORD). `next` es la ruta interna a la que
 * volver tras entrar (la valida el server con `safeNext`).
 */
export function SiteUnlock({ next }: { next: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    unlockSiteAction,
    {},
  );

  return (
    <div
      className="min-h-screen grid place-items-center px-5"
      style={{ background: "var(--color-cream)" }}
    >
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Mi Tiendita PR" className="h-10 w-auto mx-auto mb-5" />
          <h1 className="font-display text-3xl">Sitio privado 🔒</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--color-ink-soft)" }}>
            Acceso restringido. Entra con la contraseña para continuar.
          </p>
        </div>
        <form action={action} className="card p-6">
          <input type="hidden" name="next" value={next} />
          <label className="label" htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            className="field"
            placeholder="••••••••"
            autoComplete="current-password"
            autoFocus
            required
          />
          {state.error && (
            <p className="text-sm mt-3 font-semibold" style={{ color: "var(--color-coral-deep)" }}>
              ⚠ {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn btn-ink w-full mt-5">
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
