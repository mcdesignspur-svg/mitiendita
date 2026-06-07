"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Product, Badge, Segment, Grupo } from "@/lib/types";
import { money } from "@/lib/format";
import {
  GRADIENT_PRESETS,
  BADGE_OPTIONS,
  SEGMENT_OPTIONS,
  DEFAULT_CATEGORIES,
} from "@/lib/products";
import {
  createProductAction,
  updateProductAction,
  aiProductDraftAction,
  type FormState,
} from "@/lib/actions";
import { ImageEditor } from "./image-editor";

export function ProductForm({
  mode,
  product,
  categories = [],
  grupos = [],
}: {
  mode: "create" | "edit";
  product?: Product;
  categories?: string[];
  grupos?: Grupo[];
}) {
  const action = mode === "edit" ? updateProductAction : createProductAction;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});

  // Campos controlados (los que el autocompletar AI puede rellenar).
  const [name, setName] = useState(product?.name ?? "");
  const [emoji, setEmoji] = useState(product?.emoji ?? "📦");
  const [gradient, setGradient] = useState(product?.gradient ?? GRADIENT_PRESETS[0]);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [tagline, setTagline] = useState(product?.tagline ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [grupoIds, setGrupoIds] = useState<string[]>(product?.grupoIds ?? []);
  const [tags, setTags] = useState(product?.tags.join(", ") ?? "");
  const [badges, setBadges] = useState<Badge[]>(product?.badges ?? []);
  const [segments, setSegments] = useState<Segment[]>(product?.segments ?? []);
  const [retail, setRetail] = useState(product?.retail ?? 0);
  const [wholesale, setWholesale] = useState(product?.wholesale ?? 0);
  const [moq, setMoq] = useState(product?.moq ?? 1);
  const [unitsPerCase, setUnitsPerCase] = useState(product?.unitsPerCase ?? 1);
  const [shippingPrice, setShippingPrice] = useState(product?.shippingPrice ?? 0);
  const [landedCost, setLandedCost] = useState(product?.landedCost ?? 0);
  const [sourceUrl, setSourceUrl] = useState(product?.sourceUrl ?? "");
  const [discount, setDiscount] = useState(product?.discountPercent ?? 0);

  // Estado del autocompletar AI.
  const [aiPending, setAiPending] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);

  const catOptions = Array.from(new Set([...categories, ...DEFAULT_CATEGORIES]));
  const previewPrice = discount > 0 ? Math.round(retail * (1 - discount / 100) * 100) / 100 : retail;

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
  }

  async function autofill() {
    if (!name.trim()) {
      setAiMsg("Escribe el nombre del producto primero.");
      return;
    }
    setAiPending(true);
    setAiMsg(null);
    try {
      const res = await aiProductDraftAction({
        name,
        landedCost: landedCost || undefined,
        category: category || undefined,
        sourceUrl: sourceUrl || undefined,
      });
      if (res.error || !res.draft) {
        setAiMsg(res.error ?? "No se pudo autocompletar.");
      } else {
        const d = res.draft;
        setEmoji(d.emoji || emoji);
        setCategory(d.category);
        setTagline(d.tagline);
        setDescription(d.description);
        setTags(d.tags.join(", "));
        setBadges(d.badges);
        setSegments(d.segments);
        setRetail(d.retail);
        setWholesale(d.wholesale);
        setMoq(d.moq);
        setUnitsPerCase(d.unitsPerCase);
        setShippingPrice(d.shippingPrice);
        if (d.landedCost) setLandedCost(d.landedCost);
        setAiMsg(
          d.source === "ai"
            ? "🤖 Ficha generada con AI. Revisa y ajusta antes de guardar."
            : "📝 Ficha generada con plantilla (activa AI_GATEWAY_API_KEY para mejores resultados).",
        );
      }
    } catch {
      setAiMsg("No se pudo autocompletar. Intenta de nuevo.");
    } finally {
      setAiPending(false);
    }
  }

  return (
    <form action={formAction} className="grid lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
      <div className="space-y-6">
        {/* Autocompletar con AI */}
        <div className="card p-5" style={{ background: "var(--color-cream-2)" }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-display text-lg">✨ Autocompletar con AI</div>
              <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
                Escribe el nombre (y opcionalmente costo importado / enlace) y deja que la AI
                rellene descripción, tags, segmentos y precios.
              </p>
            </div>
            <button type="button" onClick={autofill} disabled={aiPending} className="btn btn-primary">
              {aiPending ? "Generando…" : "✨ Autocompletar"}
            </button>
          </div>
          {aiMsg && (
            <p className="text-sm mt-3 font-semibold" style={{ color: "var(--color-grape)" }}>{aiMsg}</p>
          )}
        </div>

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
              <input id="tagline" name="tagline" className="field" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Lo que engancha en una línea" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">Descripción</label>
              <textarea id="description" name="description" className="field min-h-24" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
          </div>
        </fieldset>

        {/* Clasificación */}
        <fieldset className="card p-6">
          <legend className="font-display text-xl px-2">Clasificación</legend>
          <div className="grid sm:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="label" htmlFor="category">Categoría</label>
              <input id="category" name="category" className="field" list="cat-list" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ej. Tech & Gadgets" />
              <datalist id="cat-list">{catOptions.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="tags">Etiquetas (separadas por coma)</label>
              <input id="tags" name="tags" className="field" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="carro, viral, regalo" />
            </div>
            <div className="sm:col-span-2">
              <span className="label">Grupos</span>
              {grupos.length === 0 ? (
                <p className="text-sm" style={{ color: "var(--color-muted)" }}>
                  No hay grupos todavía.{" "}
                  <Link href="/admin/grupos" className="font-semibold hover:underline" style={{ color: "var(--color-grape)" }}>
                    Crea uno en Grupos →
                  </Link>
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {grupos.map((g) => {
                    const on = grupoIds.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold cursor-pointer transition-colors"
                        style={{
                          background: on ? g.color || "var(--color-ink)" : "var(--color-cream-2)",
                          color: on ? "#fff" : "var(--color-ink-soft)",
                          border: "1.5px solid var(--color-ink)",
                        }}
                      >
                        <input
                          type="checkbox"
                          name="grupoIds"
                          value={g.id}
                          checked={on}
                          onChange={() => setGrupoIds((cur) => toggle(cur, g.id))}
                          className="sr-only"
                        />
                        <span aria-hidden>{g.emoji}</span>
                        {g.name}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <span className="label">Badges</span>
              <div className="flex flex-wrap gap-3">
                {BADGE_OPTIONS.map((b) => (
                  <label key={b.value} className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                    <input type="checkbox" name="badges" value={b.value} checked={badges.includes(b.value)} onChange={() => setBadges((cur) => toggle(cur, b.value))} />
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
                    <input type="checkbox" name="segments" value={s.value} checked={segments.includes(s.value)} onChange={() => setSegments((cur) => toggle(cur, s.value))} />
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
            <Num label="Precio mayorista (USD)" name="wholesale" value={wholesale} onChange={setWholesale} step="0.01" />
            <Num label="Mínimo mayorista (uds)" name="moq" value={moq} onChange={setMoq} step="1" />
            <Num label="Caja máster (uds)" name="unitsPerCase" value={unitsPerCase} onChange={setUnitsPerCase} step="1" />
            <Num label="Costo de envío (USD)" name="shippingPrice" value={shippingPrice} onChange={setShippingPrice} step="0.01" />
            <Num label="Costo importado (USD)" name="landedCost" value={landedCost} onChange={setLandedCost} step="0.01" />
            <Field label="Inventario (uds)" name="stock" defaultValue={product?.stock ?? 0} type="number" step="1" />
            <div>
              <label className="label" htmlFor="sourceUrl">Enlace proveedor (Alibaba)</label>
              <input id="sourceUrl" name="sourceUrl" className="field" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>
        </fieldset>

        {/* Imagen */}
        <fieldset className="card p-6">
          <legend className="font-display text-xl px-2">Imagen del producto</legend>
          <input type="hidden" name="imageUrl" value={imageUrl} />
          <input type="hidden" name="gradient" value={gradient} />

          <p className="text-sm mb-3 mt-2" style={{ color: "var(--color-ink-soft)" }}>
            Sube una foto real (recomendado). Se recorta a cuadrado con el editor.
          </p>
          <ImageEditor value={imageUrl} onChange={setImageUrl} />

          <p className="text-sm mb-2 mt-6 font-semibold" style={{ color: "var(--color-ink-soft)" }}>
            Fondo de respaldo
            <span className="font-normal" style={{ color: "var(--color-muted)" }}> · se usa solo si no hay foto</span>
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
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageUrl} alt="vista previa" className="aspect-[4/3] w-full object-cover" />
            ) : (
              <div className="aspect-[4/3] grid place-items-center text-6xl" style={{ background: gradient }}>
                <span className="drop-shadow-lg">{emoji || "📦"}</span>
              </div>
            )}
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
