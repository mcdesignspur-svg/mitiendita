"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useCart } from "./cart-context";
import { AthButton, type AthOrder } from "./ath-button";
import { money } from "@/lib/format";
import {
  checkoutAction,
  priceCartAction,
  type FormState,
  type PricedCartState,
} from "@/lib/actions";

const ATHM_PUB = process.env.NEXT_PUBLIC_ATHM_PUBLIC_TOKEN || "";
const ATHM_PHONE = process.env.NEXT_PUBLIC_ATHM_PHONE || "";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const EMPTY_PRICED: PricedCartState = {
  kind: "b2c",
  wholesale: false,
  lines: [],
  subtotal: 0,
  shipping: 0,
  total: 0,
  minOrder: 0,
  belowMin: false,
};

export function CartView({
  kind,
  businessName,
}: {
  // `kind`/`businessName` vienen del server (la sesión). El precio real, los
  // totales y el kind efectivo los recalcula el server (priceCartAction); estos
  // props solo afinan los textos antes de que llegue el primer repricing.
  kind: "b2c" | "b2b";
  businessId?: string;
  businessName?: string;
}) {
  const { lines, setQty, remove } = useCart();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    checkoutAction,
    {},
  );

  // CR-1: el carrito solo guarda {productId, qty}. Pedimos al server que lo
  // repricie (precios reales, descuentos, mayorista) para MOSTRARLO.
  const [priced, setPriced] = useState<PricedCartState>(EMPTY_PRICED);
  const [, startPricing] = useTransition();
  const intentSig = JSON.stringify(lines);
  useEffect(() => {
    let cancelled = false;
    if (lines.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPriced(EMPTY_PRICED);
      return;
    }
    startPricing(async () => {
      const res = await priceCartAction(lines);
      if (!cancelled) setPriced(res);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intentSig]);

  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [athOrder, setAthOrder] = useState<AthOrder | null>(null);
  const [athLoading, setAthLoading] = useState(false);
  const [athError, setAthError] = useState<string | null>(null);
  const lastSig = useRef("");

  // Líneas a enviar al server (solo intención). El server las repricia.
  const intent = lines.map((l) => ({ productId: l.productId, qty: l.qty }));
  const effectiveKind = priced.wholesale ? "b2b" : kind;
  const subtotal = priced.subtotal;
  const shipping = priced.shipping;
  const total = priced.total;
  // Cash-first: ATH Móvil sirve B2C y B2B (≤ $1,500, el tope de ATH). Pedidos
  // mayorista mayores se pagan con tarjeta (Stripe).
  const athAvailable = total > 0 && total <= 1500 && !!ATHM_PUB;
  const belowMin = priced.belowMin;
  const contactReady = customerName.trim().length > 1 && EMAIL_RE.test(email);

  // Cuando hay nombre + email válidos, prepara la orden ATH y el botón aparece
  // solo. El server recalcula precio/total; aquí solo mandamos {productId, qty}.
  const sig = JSON.stringify({ n: customerName.trim(), e: email.trim(), intent });
  useEffect(() => {
    if (!athAvailable || !contactReady || belowMin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAthOrder(null);
      lastSig.current = "";
      return;
    }
    if (lastSig.current === sig) return;
    const h = setTimeout(async () => {
      lastSig.current = sig;
      setAthLoading(true);
      setAthError(null);
      try {
        const res = await fetch("/api/ath/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ customerName, email, items: intent }),
        });
        const data = await res.json();
        if (!res.ok || !data.order) throw new Error(data.error || "No se pudo preparar ATH Móvil.");
        setAthOrder(data.order as AthOrder);
      } catch (err) {
        setAthError(err instanceof Error ? err.message : "No se pudo preparar ATH Móvil.");
        setAthOrder(null);
      } finally {
        setAthLoading(false);
      }
    }, 600);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, contactReady, athAvailable, belowMin]);

  if (lines.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="text-5xl mb-4">🛒</div>
        <h2 className="font-display text-2xl mb-2">Tu carrito está vacío</h2>
        <p className="mb-6" style={{ color: "var(--color-ink-soft)" }}>
          Explora el catálogo y agrega lo más viral.
        </p>
        <Link href="/productos" className="btn btn-primary">
          Ver catálogo →
        </Link>
      </div>
    );
  }

  // Mapa de presentación id→línea repreciada (server). Si aún no llegó, usamos
  // un placeholder neutral para no mostrar precios del cliente.
  const priceById = new Map(priced.lines.map((l) => [l.productId, l]));

  return (
    <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
      {/* lines */}
      <div className="space-y-3">
        {lines.map((l) => {
          const p = priceById.get(l.productId);
          const name = p?.name ?? "Producto";
          const emoji = p?.emoji ?? "📦";
          const slug = p?.slug ?? "";
          const unitPrice = p?.unitPrice ?? 0;
          return (
            <div key={l.productId} className="card p-3 sm:p-4 flex flex-wrap items-center gap-3 sm:gap-4">
              <Link
                href={slug ? `/productos/${slug}` : "/productos"}
                className="grid place-items-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl text-3xl shrink-0"
                style={{ background: "var(--color-cream-2)", border: "1.5px solid var(--color-line)" }}
              >
                {emoji}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={slug ? `/productos/${slug}` : "/productos"} className="font-semibold hover:underline block truncate">
                  {name}
                </Link>
                <span className="text-sm" style={{ color: "var(--color-muted)" }}>
                  {money(unitPrice)} c/u
                </span>
              </div>
              {/* Controles: en móvil bajan a una segunda línea a ancho completo */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                <div className="flex items-center rounded-full overflow-hidden shrink-0" style={{ border: "2px solid var(--color-ink)" }}>
                  <button className="px-3 py-2 font-bold" onClick={() => setQty(l.productId, l.qty - 1)} aria-label="Menos">−</button>
                  <span className="px-3 font-bold tabular-nums">{l.qty}</span>
                  <button className="px-3 py-2 font-bold" onClick={() => setQty(l.productId, l.qty + 1)} aria-label="Más">+</button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg text-right tabular-nums sm:w-20 shrink-0">
                    {money(l.qty * unitPrice)}
                  </span>
                  <button onClick={() => remove(l.productId)} className="text-xl shrink-0 p-1" aria-label="Eliminar" style={{ color: "var(--color-muted)" }}>
                    ✕
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* checkout */}
      <div className="card p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-2xl mb-1">Resumen</h2>
        {effectiveKind === "b2b" && (
          <p className="text-xs font-semibold mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: "#e7f7f3", color: "var(--color-teal-deep)" }}>
            ✅ Pedido mayorista · {businessName}
          </p>
        )}
        {priced.notice && (
          <p className="text-sm mb-3 font-semibold" style={{ color: "#a06b00" }}>
            {priced.notice}
          </p>
        )}
        <div className="flex justify-between py-3 border-b" style={{ borderColor: "var(--color-line)" }}>
          <span style={{ color: "var(--color-ink-soft)" }}>Subtotal</span>
          <span className="font-bold tabular-nums">{money(subtotal)}</span>
        </div>
        <div className="flex justify-between py-3 border-b" style={{ borderColor: "var(--color-line)" }}>
          <span style={{ color: "var(--color-ink-soft)" }}>Envío</span>
          <span className="font-bold tabular-nums">{shipping > 0 ? money(shipping) : "Gratis"}</span>
        </div>
        <div className="flex justify-between py-3 mb-4 text-lg">
          <span className="font-bold">Total</span>
          <span className="font-display text-2xl tabular-nums">{money(total)}</span>
        </div>

        <label className="label" htmlFor="customerName">Nombre</label>
        <input
          id="customerName"
          className="field mb-3"
          placeholder="Tu nombre"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          className="field mb-4"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {/* Tarjeta / factura (Stripe). Solo mandamos intención: el server reprecia
            y deriva kind/businessId/precio desde la sesión (CR-1). */}
        <form action={formAction}>
          <input type="hidden" name="items" value={JSON.stringify(intent)} />
          <input type="hidden" name="customerName" value={customerName} />
          <input type="hidden" name="email" value={email} />

          {state.error && (
            <p className="text-sm mb-3 font-semibold" style={{ color: "var(--color-coral-deep)" }}>
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending || belowMin || total <= 0} className="btn btn-primary w-full">
            {pending
              ? "Procesando…"
              : belowMin
                ? "Agrega más para el mínimo mayorista"
                : effectiveKind === "b2b"
                  ? "Pagar pedido mayorista →"
                  : "Pagar con tarjeta →"}
          </button>
        </form>

        {/* ATH Móvil — el botón oficial aparece solo al tener nombre+email */}
        {athAvailable && !belowMin && (
          <div className="mt-3">
            {athOrder ? (
              <AthButton key={athOrder.id} order={athOrder} publicToken={ATHM_PUB} phone={ATHM_PHONE} />
            ) : (
              <div
                className="text-center text-sm rounded-xl px-4 py-3"
                style={{ background: "#fff4ef", color: "var(--color-coral-deep)", border: "1.5px solid #ffd0bf" }}
              >
                🇵🇷 Escribe tu <strong>nombre</strong> y <strong>email</strong> arriba para pagar con ATH Móvil
                {athLoading && " · preparando…"}
              </div>
            )}
            {athError && (
              <p className="text-sm mt-2 font-semibold" style={{ color: "var(--color-coral-deep)" }}>
                {athError}
              </p>
            )}
          </div>
        )}

        <p className="text-xs mt-3 text-center" style={{ color: "var(--color-muted)" }}>
          {effectiveKind === "b2b"
            ? "Pedido mayorista: paga ahora con tarjeta o ATH Móvil. Sin mínimos por producto."
            : athAvailable
              ? "Pago seguro: tarjeta y Apple/Google Pay (Stripe), o ATH Móvil."
              : "Pago seguro con Stripe. Aceptamos tarjeta, Apple Pay y Google Pay."}
        </p>
      </div>
    </div>
  );
}
