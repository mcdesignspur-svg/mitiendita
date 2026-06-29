import Link from "next/link";
import { listProducts, listGrupos } from "@/lib/db";
import { effectiveRetail, hasDiscount } from "@/lib/products";
import { money } from "@/lib/format";
import { toggleProductActiveAction } from "@/lib/actions";
import { DeleteProductButton } from "@/components/confirm-delete";
import { CopyClosedLink } from "@/components/copy-closed-link";

export const metadata = { title: "Productos — Mi Tiendita PR" };

const OK_MSG: Record<string, string> = {
  creado: "✅ Producto creado.",
  guardado: "✅ Cambios guardados.",
  eliminado: "🗑 Producto eliminado.",
};

export default async function AdminProductosPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const products = await listProducts();
  const grupos = await listGrupos();
  const grupoById = new Map(grupos.map((g) => [g.id, g]));

  return (
    <div className="wrap py-10">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-2">
        <div>
          <span className="eyebrow">Catálogo</span>
          <h1 className="font-display text-4xl mt-2">Productos</h1>
        </div>
        <Link href="/admin/productos/nuevo" className="btn btn-primary">+ Nuevo producto</Link>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--color-ink-soft)" }}>
        {products.length} productos · {products.filter((p) => p.active !== false).length} visibles en la tienda
      </p>

      {ok && OK_MSG[ok] && (
        <div className="card-flat px-5 py-3 mb-6 font-semibold" style={{ background: "#e7f7f3", borderColor: "var(--color-teal)" }}>
          {OK_MSG[ok]}
        </div>
      )}

      <div className="space-y-3">
        {products.map((p) => {
          const eff = effectiveRetail(p);
          const discounted = hasDiscount(p);
          const visible = p.active !== false;
          return (
            <div key={p.id} className="card p-4 flex flex-wrap items-center gap-4">
              <div
                className="grid place-items-center w-14 h-14 rounded-xl text-2xl shrink-0 overflow-hidden relative"
                style={{ background: p.gradient, border: "1.5px solid var(--color-ink)" }}
              >
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  p.emoji
                )}
              </div>

              <div className="min-w-[12rem] flex-1">
                <Link href={`/admin/productos/${p.id}`} className="font-semibold hover:underline">
                  {p.name}
                </Link>
                <div className="text-xs mt-0.5" style={{ color: "var(--color-muted)" }}>
                  {p.category}
                </div>
                {(p.grupoIds ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(p.grupoIds ?? []).map((gid) => {
                      const g = grupoById.get(gid);
                      if (!g) return null;
                      return (
                        <span
                          key={gid}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: g.color || "var(--color-ink)", color: "#fff" }}
                        >
                          {g.emoji} {g.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="text-sm">
                <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Detal</div>
                <div className="font-bold tabular-nums">
                  {money(eff)}
                  {discounted && (
                    <span className="text-xs line-through ml-1" style={{ color: "var(--color-muted)" }}>{money(p.retail)}</span>
                  )}
                </div>
              </div>

              <div className="text-sm">
                <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Mayor</div>
                <div className="font-bold tabular-nums" style={{ color: "var(--color-teal-deep)" }}>{money(p.wholesale)}</div>
              </div>

              <div className="text-sm">
                <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Envío</div>
                <div className="font-bold tabular-nums">{(p.shippingPrice ?? 0) > 0 ? money(p.shippingPrice ?? 0) : "—"}</div>
              </div>

              <div className="text-sm">
                <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>Stock</div>
                <div className="font-bold tabular-nums">{p.stock}</div>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <form action={toggleProductActiveAction}>
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    className="badge"
                    style={
                      visible
                        ? { background: "#e7f7f3", color: "var(--color-teal-deep)", borderColor: "var(--color-teal)" }
                        : { background: "var(--color-cream-2)", color: "var(--color-muted)", borderColor: "var(--color-line)" }
                    }
                    title="Cambiar visibilidad"
                  >
                    {visible ? "● Visible" : "○ Oculto"}
                  </button>
                </form>
                <CopyClosedLink slug={p.slug} productName={p.name} />
                <Link href={`/admin/productos/${p.id}`} className="btn btn-ghost btn-sm">Editar</Link>
                <DeleteProductButton id={p.id} name={p.name} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
