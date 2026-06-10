"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  loginBusinessAction,
  registerBusinessAction,
  type FormState,
} from "@/lib/actions";

const MUNICIPIOS = [
  "San Juan", "Bayamón", "Carolina", "Ponce", "Caguas", "Guaynabo", "Mayagüez",
  "Arecibo", "Toa Baja", "Trujillo Alto", "Humacao", "Vega Baja", "Manatí",
  "Aguadilla", "Fajardo", "Cayey", "Cidra", "Yauco", "Otro",
];

const TYPES = [
  { value: "gasolinera", label: "Gasolinera" },
  { value: "farmacia", label: "Farmacia" },
  { value: "minimarket", label: "Mini-market" },
  { value: "colmado", label: "Colmado" },
  { value: "otro", label: "Otro comercio" },
];

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    registerBusinessAction,
    {},
  );

  return (
    <form action={action} className="card p-6 md:p-8">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Nombre del negocio *" name="businessName" placeholder="Ej. Gasolinera Caribe Express" required full />
        <div className="sm:col-span-2 grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="type">Tipo de negocio *</label>
            <select id="type" name="type" className="field" defaultValue="minimarket">
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="municipio">Municipio *</label>
            <select id="municipio" name="municipio" className="field" defaultValue="San Juan">
              {MUNICIPIOS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <Field label="Persona de contacto *" name="contactName" placeholder="Tu nombre" required />
        <Field label="Teléfono" name="phone" placeholder="787-555-0100" />
        <Field label="Email *" name="email" type="email" placeholder="negocio@email.com" required />
        <Field
          label="Registro de Comerciante *"
          name="registroComerciante"
          placeholder="Ej. PR-2026-XXXXXX"
          required
          hint="Número de tu Certificado de Registro de Comerciante (Hacienda PR)."
        />
        <Field label="Contraseña *" name="password" type="password" placeholder="mínimo 6 caracteres" required full />
      </div>

      {state.error && (
        <p className="text-sm mt-4 font-semibold" style={{ color: "var(--color-coral-deep)" }}>
          ⚠ {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full mt-6">
        {pending ? "Creando cuenta…" : "Crear cuenta de negocio →"}
      </button>
      <p className="text-sm text-center mt-4" style={{ color: "var(--color-ink-soft)" }}>
        ¿Ya tienes cuenta?{" "}
        <Link href="/negocios/entrar" className="font-semibold underline">Acceder</Link>
      </p>
    </form>
  );
}

export function LoginForm({ showDemo = false }: { showDemo?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    loginBusinessAction,
    {},
  );

  return (
    <form action={action} className="card p-6 md:p-8">
      <Field label="Email" name="email" type="email" placeholder="negocio@email.com" required full />
      <div className="mt-4">
        <Field label="Contraseña" name="password" type="password" placeholder="Tu contraseña" required full />
      </div>

      {state.error && (
        <p className="text-sm mt-4 font-semibold" style={{ color: "var(--color-coral-deep)" }}>
          ⚠ {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary w-full mt-6">
        {pending ? "Entrando…" : "Acceder →"}
      </button>
      <p className="text-sm text-center mt-4" style={{ color: "var(--color-ink-soft)" }}>
        ¿Nuevo negocio?{" "}
        <Link href="/negocios/registro" className="font-semibold underline">Crear cuenta</Link>
      </p>
      {showDemo && (
        <div className="mt-4 text-xs text-center rounded-lg p-3" style={{ background: "var(--color-cream-2)", color: "var(--color-muted)" }}>
          Demo verificada: <strong>demo@gasolinera.pr</strong> / <strong>demo1234</strong>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  hint,
  full,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="field"
      />
      {hint && (
        <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{hint}</p>
      )}
    </div>
  );
}
