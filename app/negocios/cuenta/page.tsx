import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionBusiness } from "@/lib/auth";
import { listOrders } from "@/lib/db";
import { logoutBusinessAction } from "@/lib/actions";
import { money } from "@/lib/format";
import type { BusinessStatus } from "@/lib/types";

export const metadata = { title: "Mi cuenta — Mi Tiendita PR" };

const STATUS: Record<BusinessStatus, { label: string; bg: string; fg: string; icon: string; note: string }> = {
  verified: {
    label: "Verificado",
    bg: "#e7f7f3",
    fg: "var(--color-teal-deep)",
    icon: "✅",
    note: "Tu Registro de Comerciante fue verificado. Tienes precios mayoristas activos.",
  },
  pending: {
    label: "En verificación",
    bg: "#fff7e6",
    fg: "#a06b00",
    icon: "⏳",
    note: "Estamos verificando tu Registro de Comerciante. Normalmente toma de 24 a 48 horas.",
  },
  rejected: {
    label: "No verificado",
    bg: "#fdecea",
    fg: "var(--color-coral-deep)",
    icon: "⚠",
    note: "No pudimos verificar tu Registro de Comerciante. Escríbenos para resolverlo.",
  },
};

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ bienvenida?: string }>;
}) {
  const business = await getSessionBusiness();
  if (!business) redirect("/negocios/entrar");

  const { bienvenida } = await searchParams;
  const status = STATUS[business.status];
  const orders = (await listOrders()).filter((o) => o.businessId === business.id);

  return (
    <div className="wrap py-12 max-w-4xl">
      {bienvenida && (
        <div className="card-flat px-5 py-3 mb-6 font-semibold" style={{ background: "#fff4ef", borderColor: "var(--color-coral)" }}>
          🎉 ¡Cuenta creada! Ya casi: verificamos tu Registro de Comerciante y desbloqueamos tus precios.
        </div>
      )}

      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <span className="eyebrow">Cuenta de negocio</span>
          <h1 className="font-display text-4xl mt-2">{business.businessName}</h1>
        </div>
        <form action={logoutBusinessAction}>
          <button className="btn btn-ghost btn-sm">Cerrar sesión</button>
        </form>
      </div>

      {/* status */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="badge" style={{ background: status.bg, color: status.fg, borderColor: status.fg }}>
            {status.icon} {status.label}
          </span>
        </div>
        <p style={{ color: "var(--color-ink-soft)" }}>{status.note}</p>
        {business.status === "verified" && (
          <Link href="/productos" className="btn btn-primary mt-4">Ir al catálogo mayorista →</Link>
        )}
      </div>

      {/* details */}
      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <Detail label="Tipo de negocio" value={typeLabel(business.type)} />
        <Detail label="Municipio" value={business.municipio} />
        <Detail label="Contacto" value={business.contactName} />
        <Detail label="Teléfono" value={business.phone || "—"} />
        <Detail label="Email" value={business.email} />
        <Detail label="Registro de Comerciante" value={business.registroComerciante} />
      </div>

      {/* orders */}
      <div className="card p-6">
        <h2 className="font-display text-2xl mb-4">Pedidos recientes</h2>
        {orders.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>
            Aún no tienes pedidos.{" "}
            <Link href="/productos" className="underline font-semibold">Empieza a comprar →</Link>
          </p>
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between card-flat px-4 py-3">
                <div>
                  <span className="font-semibold">{o.id}</span>
                  <span className="text-sm ml-2" style={{ color: "var(--color-muted)" }}>
                    {o.items.reduce((s, i) => s + i.qty, 0)} uds
                  </span>
                </div>
                <span className="font-display text-lg">{money(o.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-flat px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--color-muted)" }}>{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function typeLabel(t: string): string {
  return (
    {
      gasolinera: "Gasolinera",
      farmacia: "Farmacia",
      minimarket: "Mini-market",
      colmado: "Colmado",
      otro: "Otro comercio",
    }[t] || t
  );
}
