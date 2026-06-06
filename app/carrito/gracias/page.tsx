import Link from "next/link";
import { getOrderById } from "@/lib/db";
import { money } from "@/lib/format";
import { ClearCart } from "@/components/clear-cart";

export const metadata = { title: "¡Gracias! — Mi Tiendita PR" };

export default async function GraciasPage({
  searchParams,
}: {
  searchParams: Promise<{ o?: string }>;
}) {
  const { o } = await searchParams;
  const order = o ? await getOrderById(o) : undefined;

  return (
    <div className="wrap py-16 max-w-2xl">
      <ClearCart />
      <div className="card p-8 md:p-12 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="font-display text-4xl mb-2">¡Pedido confirmado!</h1>
        <p className="mb-6" style={{ color: "var(--color-ink-soft)" }}>
          Gracias por tu compra. Nuestro equipo ya está preparando tu pedido.
        </p>

        {order ? (
          <div className="text-left card-flat p-5 mb-6">
            <div className="flex justify-between text-sm mb-3" style={{ color: "var(--color-muted)" }}>
              <span>Orden <strong style={{ color: "var(--color-ink)" }}>{order.id}</strong></span>
              <span>{order.kind === "b2b" ? "Mayorista" : "Detal"}</span>
            </div>
            {order.items.map((it) => (
              <div key={it.productId} className="flex justify-between py-1 text-sm">
                <span>{it.qty}× {it.name}</span>
                <span className="tabular-nums">{money(it.qty * it.unitPrice)}</span>
              </div>
            ))}
            {order.shipping ? (
              <div className="flex justify-between py-1 text-sm" style={{ color: "var(--color-muted)" }}>
                <span>Envío</span>
                <span className="tabular-nums">{money(order.shipping)}</span>
              </div>
            ) : null}
            <div className="flex justify-between pt-3 mt-2 border-t font-bold" style={{ borderColor: "var(--color-line)" }}>
              <span>Total</span>
              <span className="font-display text-lg">{money(order.total)}</span>
            </div>
          </div>
        ) : (
          <p className="mb-6" style={{ color: "var(--color-muted)" }}>
            Te enviaremos los detalles por email.
          </p>
        )}

        <div className="flex gap-3 justify-center flex-wrap">
          <Link href="/productos" className="btn btn-primary">Seguir comprando</Link>
          <Link href="/" className="btn btn-ghost">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}
