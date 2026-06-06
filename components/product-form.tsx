"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Product } from "@/lib/types";
import { money } from "@/lib/format";
import {
  GRADIENT_PRESETS,
  BADGE_OPTIONS,
  SEGMENT_OPTIONS,
  DEFAULT_CATEGORIES,
  DEFAULT_COLLECTIONS,
} from "@/lib/products";
import {
  createProductAction,
  updateProductAction,
  type FormState,
} from "@/lib/actions";

export function ProductForm({
  mode,
  product,
  categories = [],
  collections = [],
}: {
  mode: "create" | "edit";
  product?: Product;
  categories?: string[];
  collections?: string[];
}) {
  const action = mode === "edit" ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  const [name, setName] = useState(product?.name ?? "");
  const [emoji, setEmoji] = useState(product?.emoji ?? "📦");
  const [gradient, setGradient] = useState(product?.gradient ?? GRADIENT_PRESETS[0]);
  const [retail, setRetail] = useState(product?.retail ?? 0);
  const [discount, setDiscount] = useState(product?.discountPercent ?? 0);

  const catOptions = Array.from(new Set([...categories, ...DEFAULT_CATEGORIES]));
  const colOptions = Array.from(new Set([...collections, ...DEFAULT_COLLECTIONS]));
  const previewPrice = discount > 0 ? Math.round(retail * (1 - discount / 100) * 100) / 100 : retail;

  return (
    <form action={formAction} className="grid lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
      <div className="space-y-6">
        {/* Básico */}
        <fieldset className="card p-6">
          <legend className="font-display text-xl px-2">Información básica</legend>
          <div className="grid sm:grid-cols-2 gap-4 mt-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="name">Nombre *</label>
              <input id="name" name="name" className="field" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="label" htmlFor="slug">Slug (URL)</label>
              <input id="slug" name="slug" className="field" defaultValue={product?.slug} placeholder="se genera del nombre" />
            </div>
            <div>
              <label className="label" htmlFor="emoji">Emoji / ícono</label>
              <input id="emoji" name="emoji" className="field" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={4} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="tagline">Frase corta</label>
              <input id="tagline" name="tagline" className="field" defaultValue={product?.tagline} placeholder="Lo que engancha en una línea" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">Descripción</label>
              <textarea id="description" name="description" className="field min-h-24" defaultValue={product?.description} rows={4} />
            </div>
          </div>
        </fieldset>

        {/* Clasificación */}
        <fieldset className="card p-6">
          <legend className="font-display text-xl px-2">Clasificación</legend>
          <div className="grid sm:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="label" htmlFor="category">Categoría</label>
              <input id="category" name="category" className="field" list="cat-list" defaultValue={product?.category} placeholder="Ej. Tech & Gadgets" />
              <datalist id="cat-list">{catOptions.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="label" htmlFor="collection">Colección</label>
              <input id="collection" name="collection" className="field" list="col-list" defaultValue={product?.collection} placeholder="Ej. Ofertas" />
              <datalist id="col-list">{colOptions.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="tags">Etiquetas (separadas por coma)</label>
              <input id="tags" name="tags" className="field" defaultValue={product?.tags.join(", ")} placeholder="carro, viral, regalo" />
            </div>
            <div>
              <span className="label">Badges</span>
              <div className="flex flex-wrap gap-3">
                {BADGE_OPTIONS.map((b) => (
                  <label key={b.value} className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input type="checkbox" name="badges" value={b.value} defaultChecked={product?.badges.includes(b.value)} />
                    {b.label}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className="label">Segmentos</span>
              <div className="flex flex-wrap gap-3">
                {SEGMENT_OPTIONS.map((s) => (
                  <label key={s.value} className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input type="checkbox" name="segments" value={s.value} defaultChecked={product?.segments.includes(s.value)} />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </fieldset>

        {/* Precios e inventario */}
        <fieldset className="card p-6">
          <legend className="font-display text-xl px-2">Precios e inventario</legend>
          <div className="grid sm:grid-cols-3 gap-4 mt-2">
            <Num label="Precio detal (USD) *" name="retail" value={retail} onChange={setRetail} step="0.01" required />
            <Num label="Descuento (%)" name="discountPercent" value={discount} onChange={setDiscount} step="1" />
            <Field label="Precio mayorista (USD)" name="wholesale" defaultValue={product?.wholesale ?? 0} type="number" step="0.01" />
            <Field label="Mínimo mayorista (uds)" name="moq" defaultValue={product?.moq ?? 1} type="number" step="1" />
            <Field label="Caja máster (uds)" name="unitsPerCase" defaultValue={product?.unitsPerCase ?? 1} type="number" step="1" />
            <Field label="Costo de envío (USD)" name="shippingPrice" defaultValue={product?.shippingPrice ?? 0} type="number" step="0.01" />
            <Field label="Costo importado (USD)" name="landedCost" defaultValue={product?.landedCost ?? 0} type="number" step="0.01" />
            <Field label="Inventario (uds)" name="stock" defaultValue={product?.stock ?? 0} type="number" step="1" />
            <Field label="Enlace proveedor (Alibaba)" name="sourceUrl" defaultValue={product?.sourceUrl} placeholder="https://..." />
          </div>
        </fieldset>

        {/* Imagen */}
        <fieldset className="card p-6">
          <legend className="font-display text-xl px-2">Imagen</legend>
          <input type="hidden" name="gradient" value={gradient} />
          <p className="text-sm mb-3 mt-2" style={{ color: "var(--color-ink-soft)" }}>
            Elige un fondo (el emoji va encima). Luego puedes cambiarlo por foto real.
          </p>
          <div className="grid grid-cols-6 gap-2">
            {GRADIENT_PRESETS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGradient(g)}
                className="aspect-square rounded-xl"
                style={{
                  background: g,
                  border: gradient === g ? "3px solid var(--color-ink)" : "2px solid var(--color-line)",
                }}
                aria-label="Fondo"
              />
            ))}
          </div>
        </fieldset>
      </div>

      {/* Sidebar: preview + publicar */}
      <div className="space-y-6 lg:sticky lg:top-24">
        <div className="card p-5">
          <span className="label">Vista previa</span>
          <div className="card overflow-hidden mt-1">
            <div className="aspect-[4/3] grid place-items-center text-6xl" style={{ background: gradient }}>
              <span className="drop-shadow-lg">{emoji || "📦"}</span>
            </div>
            <div className="p-4">
              <h3 className="font-display text-lg leading-tight">{name || "Nombre del producto"}</h3>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="font-display text-2xl">{money(previewPrice || 0)}</span>
                {discount > 0 && retail > 0 && (
                  <span className="text-xs line-through" style={{ color: "var(--color-muted)" }}>{money(retail)}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <label className="flex items-center gap-3 font-semibold cursor-pointer">
            <input type="checkbox" name="active" defaultChecked={product?.active !== false} />
            Visible en la tienda
          </label>

          {state.error && (
            <p className="text-sm mt-4 font-semibold" style={{ color: "var(--color-coral-deep)" }}>⚠ {state.error}</p>
          )}

          {mode === "edit" && product && <input type="hidden" name="id" value={product.id} />}

          <button type="submit" disabled={pending} className="btn btn-primary w-full mt-4">
            {pending ? "Guardando…" : mode === "edit" ? "Guardar cambios" : "Crear producto"}
          </button>
          <Link href="/admin/productos" className="btn btn-ghost w-full mt-2">Cancelar</Link>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  step,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | number;
  type?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} step={step} defaultValue={defaultValue} placeholder={placeholder} className="field" />
    </div>
  );
}

function Num({
  label,
  name,
  value,
  onChange,
  step,
  required,
}: {
  label: string;
  name: string;
  value: number;
  onChange: (n: number) => void;
  step?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        required={required}
        className="field"
      />
    </div>
  );
}
