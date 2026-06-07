import Link from "next/link";
import { listGrupos, listProducts } from "@/lib/db";
import {
  createGrupoAction,
  updateGrupoAction,
  setGrupoProductsAction,
} from "@/lib/actions";
import { DeleteGrupoButton } from "@/components/confirm-delete";
import type { Grupo, Product } from "@/lib/types";

export const metadata = { title: "Grupos — Mi Tiendita PR" };

const GROUP_COLORS = [
  { value: "var(--color-coral)", label: "Coral" },
  { value: "var(--color-teal-deep)", label: "Teal" },
  { value: "var(--color-grape)", label: "Uva" },
  { value: "var(--color-sun)", label: "Sol" },
  { value: "var(--color-ink)", label: "Tinta" },
];

export default async function AdminGruposPage() {
  const grupos = await listGrupos();
  const products = await listProducts();
  const countByGrupo = new Map<string, number>();
  for (const p of products) {
    for (const gid of p.grupoIds ?? []) {
      countByGrupo.set(gid, (countByGrupo.get(gid) ?? 0) + 1);
    }
  }

  return (
    <div className="wrap py-10">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
        <div>
          <span className="eyebrow">Catálogo</span>
          <h1 className="font-display text-4xl mt-2">Grupos</h1>
        </div>
        <Link href="/admin/productos" className="btn btn-ghost btn-sm">Productos →</Link>
      </div>
      <p className="text-sm mb-8" style={{ color: "var(--color-ink-soft)" }}>
        Agrupa productos en colecciones internas (ej. “Verano”, “Imprescindibles de Carro”).
        Un producto puede estar en varios grupos. {grupos.length} grupos · {products.length} productos.
      </p>

      {/* Crear grupo */}
      <form action={createGrupoAction} className="card p-5 mb-8 grid sm:grid-cols-[5rem_1fr] gap-4 items-end">
        <div>
          <label className="label" htmlFor="emoji">Emoji</label>
          <input id="emoji" name="emoji" className="field text-center" maxLength={4} defaultValue="🗂️" />
        </div>
        <div>
          <label className="label" htmlFor="name">Nombre del grupo *</label>
          <input id="name" name="name" className="field" placeholder="Ej. Verano Boricua" required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">Descripción (opcional)</label>
          <input id="description" name="description" className="field" placeholder="Para qué sirve este grupo" />
        </div>
        <div className="sm:col-span-2">
          <span className="label">Color</span>
          <ColorPicker />
        </div>
        <button className="btn btn-primary sm:col-span-2 justify-self-start">+ Crear grupo</button>
      </form>

      {/* Lista de grupos */}
      {grupos.length === 0 ? (
        <p className="py-12 text-center" style={{ color: "var(--color-muted)" }}>
          Aún no hay grupos. Crea el primero arriba ↑
        </p>
      ) : (
        <div className="space-y-4">
          {grupos.map((g) => (
            <GrupoCard
              key={g.id}
              grupo={g}
              products={products}
              count={countByGrupo.get(g.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GrupoCard({
  grupo,
  products,
  count,
}: {
  grupo: Grupo;
  products: Product[];
  count: number;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="grid place-items-center w-12 h-12 rounded-xl text-2xl shrink-0"
            style={{ background: grupo.color || "var(--color-ink)", border: "1.5px solid var(--color-ink)" }}
          >
            {grupo.emoji}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-xl leading-tight">{grupo.name}</h3>
            {grupo.description && (
              <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>{grupo.description}</p>
            )}
          </div>
        </div>
        <span className="badge badge-soft shrink-0">{count} producto{count === 1 ? "" : "s"}</span>
      </div>

      {/* Asignar productos */}
      <details className="mt-4">
        <summary className="font-semibold cursor-pointer text-sm" style={{ color: "var(--color-grape)" }}>
          📦 Asignar productos ({count})
        </summary>
        <form action={setGrupoProductsAction} className="mt-3">
          <input type="hidden" name="gid" value={grupo.id} />
          <div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-80 overflow-auto p-1 rounded-xl"
            style={{ background: "var(--color-cream-2)" }}
          >
            {products.map((p) => {
              const on = (p.grupoIds ?? []).includes(grupo.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-2 text-sm font-semibold cursor-pointer px-3 py-2 rounded-lg"
                  style={{ background: "var(--color-cream)" }}
                >
                  <input type="checkbox" name="pids" value={p.id} defaultChecked={on} />
                  <span className="truncate">{p.emoji} {p.name}</span>
                </label>
              );
            })}
          </div>
          <button className="btn btn-primary btn-sm mt-3">Guardar asignación</button>
        </form>
      </details>

      {/* Editar */}
      <details className="mt-2">
        <summary className="font-semibold cursor-pointer text-sm" style={{ color: "var(--color-ink-soft)" }}>
          ✎ Editar grupo
        </summary>
        <form action={updateGrupoAction} className="grid sm:grid-cols-[5rem_1fr] gap-3 mt-3 items-end">
          <input type="hidden" name="gid" value={grupo.id} />
          <div>
            <label className="label" htmlFor={`emoji-${grupo.id}`}>Emoji</label>
            <input id={`emoji-${grupo.id}`} name="emoji" className="field text-center" maxLength={4} defaultValue={grupo.emoji} />
          </div>
          <div>
            <label className="label" htmlFor={`name-${grupo.id}`}>Nombre *</label>
            <input id={`name-${grupo.id}`} name="name" className="field" defaultValue={grupo.name} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor={`desc-${grupo.id}`}>Descripción</label>
            <input id={`desc-${grupo.id}`} name="description" className="field" defaultValue={grupo.description ?? ""} />
          </div>
          <div className="sm:col-span-2">
            <span className="label">Color</span>
            <ColorPicker selected={grupo.color} />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <button className="btn btn-primary btn-sm">Guardar cambios</button>
            <DeleteGrupoButton id={grupo.id} name={grupo.name} />
          </div>
        </form>
      </details>
    </div>
  );
}

function ColorPicker({ selected }: { selected?: string }) {
  const active = selected || GROUP_COLORS[0].value;
  return (
    <div className="flex flex-wrap gap-2">
      {GROUP_COLORS.map((c) => (
        <label key={c.value} className="cursor-pointer" title={c.label}>
          <input
            type="radio"
            name="color"
            value={c.value}
            defaultChecked={c.value === active}
            className="peer sr-only"
          />
          <span
            className="block w-8 h-8 rounded-full peer-checked:ring-2 peer-checked:ring-offset-2"
            style={{ background: c.value, border: "1.5px solid var(--color-ink)" }}
          />
        </label>
      ))}
    </div>
  );
}
