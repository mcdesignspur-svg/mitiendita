import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getOrderById } from "@/lib/db";
import { athEnabled, athConfig } from "@/lib/athmovil";
import { money } from "@/lib/format";
import { AthButton } from "@/components/ath-button";

export const metadata = { title: "Pagar con ATH Móvil — Mi Tiendita PR" };

export default async function AthPage({
  searchParams,
}: {
  searchParams: Promise<{ o?: string }>;
}) {
  const { o } = await searchParams;
  const order = o ? await getOrderById(o) : undefined;
  if (!order) notFound();
  if (order.paymentStatus === "pagada" || !athEnabled()) {
    redirect(`/carrito/gracias?o=${order.id}`);
  }

  const { publicToken, phone } = athConfig();

  return (
    <div className="wrap py-16 max-w-lg">
      <div className="card p-8 text-center">
        <div className="text-5xl mb-3">🇵🇷</div>
        <h1 className="font-display text-3xl mb-1">Paga con ATH Móvil</h1>
        <p className="mb-6" style={{ color: "var(--color-ink-soft)" }}>
          Orden <strong>{order.id}</strong> · total <strong>{money(order.total)}</strong>
        </p>

        <AthButton
          order={{
            id: order.id,
            total: order.total,
            shipping: order.shipping || 0,
            email: order.email,
            items: order.items,
          }}
          publicToken={publicToken}
          phone={phone}
        />

        <p className="text-xs mt-6" style={{ color: "var(--color-muted)" }}>
          Toca el botón, confirma en tu app ATH Móvil y te confirmamos el pago al instante.
        </p>
        <Link href="/carrito" className="btn btn-ghost btn-sm mt-4">← Volver al carrito</Link>
      </div>
    </div>
  );
}
