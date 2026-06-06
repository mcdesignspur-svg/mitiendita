"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useCart } from "./cart-context";
import { AthButton, type AthOrder } from "./ath-button";
import { money } from "@/lib/format";
import { checkoutAction, type FormState } from "@/lib/actions";

const ATHM_PUB = process.env.NEXT_PUBLIC_ATHM_PUBLIC_TOKEN || "";
const ATHM_PHONE = process.env.NEXT_PUBLIC_ATHM_PHONE || "";
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function CartView({
  kind,
  businessId,
  businessName,
}: {
  kind: "b2c" | "b2b";
  businessId?: string;
  businessName?: string;
}) {
  const { lines, subtotal, setQty, remove } = useCart();
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    checkoutAction,
    {},
  );

  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [athOrder, setAthOrder] = useState<AthOrder | null>(null);
  const [athLoading, setAthLoading] = useState(false);
  const [athError, setAthError] = useState<string | null>(null);
  const lastSig = useRef("");

  const items = lines.map((l) => ({
    productId: l.productId,
    name: l.name,
    qty: l.qty,
    unitPrice: l.unitPrice,
  }));
  const shipping = lines.reduce((m, l) => Math.max(m, l.shippingPrice || 0), 0);
  const total = subtotal + shipping;
  const athAvailable = kind === "b2c" && total > 0 && total <= 1500 && !!ATHM_PUB;
  const contactReady = customerName.trim().length > 1 && EMAIL_RE.test(email);

  // Cuando hay nombre + email válidos, crea la orden y el botón oficial de ATH
  // Móvil aparece solo (sin clic intermedio). Se re-crea si cambia el carrito.
  const sig = JSON.stringify({ n: customerName.trim(), e: email.trim(), items, shipping });
  useEffect(() => {
    if (!athAvailable || !contactReady) {
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
          body: JSON.stringify({ customerName, email, items, shipping }),
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
  }, [sig, contactReady, athAvailable]);

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

  return (
    <div className="grid lg:grid-cols-[1.6fr_1fr] gap-8 items-start">
      {/* lines */}
      <div className="space-y-3">
        {lines.map((l) => (
          <div key={l.productId} className="card p-3 sm:p-4 flex flex-wrap items-center gap-3 sm:gap-4">
            <Link
              href={`/productos/${l.slug}`}
              className="grid place-items-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl text-3xl shrink-0"
              style={{ background: "var(--color-cream-2)", border: "1.5px solid var(--color-line)" }}
            >
              {l.emoji}
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/productos/${l.slug}`} className="font-semibold hover:underline block truncate">
                {l.name}
              </Link>
              <span className="text-sm" style={{ color: "var(--color-muted)" }}>
                {money(l.unitPrice)} c/u
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
                  {money(l.qty * l.unitPrice)}
                </span>
                <button onClick={() => remove(l.productId)} className="text-xl shrink-0 p-1" aria-label="Eliminar" style={{ color: "var(--color-muted)" }}>
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* checkout */}
      <div className="card p-6 lg:sticky lg:top-24">
        <h2 className="font-display text-2xl mb-1">Resumen</h2>
        {kind === "b2b" && (
          <p className="text-xs font-semibold mb-3 inline-flex items-center gap-2 px-3 py-1 rounded-full" style={{ background: "#e7f7f3", color: "var(--color-teal-deep)" }}>
            ✅ Pedido mayorista · {businessName}
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

        {/* Tarjeta / factura (Stripe) */}
        <form action={formAction}>
          <input type="hidden" name="items" value={JSON.stringify(items)} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="shipping" value={shipping} />
          <input type="hidden" name="method" value="stripe" />
          <input type="hidden" name="customerName" value={customerName} />
          <input type="hidden" name="email" value={email} />
          {businessId && <input type="hidden" name="businessId" value={businessId} />}

          {state.error && (
            <p className="text-sm mb-3 font-semibold" style={{ color: "var(--color-coral-deep)" }}>
              {state.error}
            </p>
          )}

          <button type="submit" disabled={pending} className="btn btn-primary w-full">
            {pending
              ? "Procesando…"
              : kind === "b2b"
                ? "Confirmar pedido (factura) →"
                : "Pagar con tarjeta →"}
          </button>
        </form>

        {/* ATH Móvil (B2C) — el botón oficial aparece solo al tener nombre+email */}
        {athAvailable && (
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
          {kind === "b2b"
            ? "Pedido mayorista: te enviamos la factura con términos (net 15/30)."
            : athAvailable
              ? "Pago seguro: tarjeta y Apple/Google Pay (Stripe), o ATH Móvil."
              : "Pago seguro con Stripe. Aceptamos tarjeta, Apple Pay y Google Pay."}
        </p>
      </div>
    </div>
  );
}
