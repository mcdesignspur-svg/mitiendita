"use client";

import { useActionState, useEffect, useState } from "react";
import type { PublicProduct } from "@/lib/public-product";
import { effectiveRetailPublic, hasDiscountPublic } from "@/lib/public-product";
import { money } from "@/lib/format";
import { crearOrdenAthAction, type FormState } from "@/lib/actions";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Compra contenida para un link cerrado, con checkout MANUAL por ATH Móvil
 * (resuelve mientras ATH no está habilitado como pasarela):
 *
 *   1. El cliente llena nombre + email y elige cantidad.
 *   2. "Continuar" abre una ventana con el resumen y el botón "Hacer orden".
 *   3. "Hacer orden" crea la orden (ath_movil / pendiente_pago) y la ventana
 *      muestra el número de ATH Móvil para enviar el pago.
 *
 * Solo postea la intención `[{productId, qty}]` — el server re-precia (lib/pricing).
 * `athPhone`/`athNombre` vienen del server (env ATH_MOVIL_PHONE / ATH_MOVIL_NOMBRE).
 */
export function ExclusiveBuy({
  product,
  wholesale,
  athPhone,
  athNombre,
}: {
  product: PublicProduct;
  wholesale: boolean;
  athPhone?: string;
  athNombre?: string;
}) {
  const isWholesale = wholesale && product.wholesale != null;
  const maxQty = product.stock > 0 ? product.stock : 0;
  const isOutOfStock = product.stock === 0;
  const [qty, setQty] = useState(1);
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    crearOrdenAthAction,
    {},
  );

  const retail = effectiveRetailPublic(product);
  const unitPrice = isWholesale ? product.wholesale! : retail;
  const showDiscount = !wholesale && hasDiscountPublic(product);
  const shipping = product.shippingPrice ?? 0;
  const clampedQty = maxQty > 0 ? Math.min(qty, maxQty) : 1;
  const total = clampedQty * unitPrice + shipping;
  const contactReady = customerName.trim().length > 1 && EMAIL_RE.test(email);

  const items = [{ productId: product.id, qty: clampedQty }];
  const done = state.order != null;

  // Animación de entrada + bloqueo de scroll mientras la ventana está abierta.
  useEffect(() => {
    if (!open) return;
    setShown(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  function close() {
    setShown(false);
    setTimeout(() => setOpen(false), 180);
  }

  async function copyPhone() {
    if (!athPhone) return;
    try {
      await navigator.clipboard.writeText(athPhone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="card p-6">
      {isWholesale ? (
        <>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-4xl" style={{ color: "var(--color-teal-deep)" }}>
              {money(product.wholesale!)}
            </span>
            <span className="text-sm font-semibold" style={{ color: "var(--color-muted)" }}>
              / unidad · mayorista
            </span>
          </div>
          <p className="text-sm mt-1 line-through" style={{ color: "var(--color-muted)" }}>
            Detal {money(product.retail)}
          </p>
        </>
      ) : (
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-display text-4xl">{money(retail)}</span>
          {showDiscount && (
            <>
              <span className="text-base line-through" style={{ color: "var(--color-muted)" }}>
                {money(product.retail)}
              </span>
              <span className="badge" style={{ background: "var(--color-grape)", color: "#fff" }}>
                −{product.discountPercent}% OFF
              </span>
            </>
          )}
        </div>
      )}

      <p className="text-sm mt-4" style={{ color: "var(--color-ink-soft)" }}>
        🚚 Envío: <strong>{shipping > 0 ? money(shipping) : "Gratis"}</strong>
      </p>

      {isOutOfStock ? (
        <div
          className="mt-4 px-4 py-3 rounded-xl text-sm font-semibold text-center"
          style={{ background: "var(--color-cream-2)", color: "var(--color-ink-soft)", border: "1.5px solid var(--color-line)" }}
        >
          Bajo pedido — contáctanos para disponibilidad
        </div>
      ) : (
        <>
          {/* cantidad */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center rounded-full overflow-hidden" style={{ border: "2px solid var(--color-ink)" }}>
              <button
                type="button"
                className="px-4 py-2 font-bold text-lg"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Reducir cantidad"
                disabled={clampedQty <= 1}
              >
                −
              </button>
              <span className="px-4 font-bold tabular-nums min-w-[3ch] text-center">{clampedQty}</span>
              <button
                type="button"
                className="px-4 py-2 font-bold text-lg"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                aria-label="Aumentar cantidad"
                disabled={maxQty > 0 && clampedQty >= maxQty}
              >
                +
              </button>
            </div>
            <span className="text-sm font-semibold" style={{ color: "var(--color-ink-soft)" }}>
              Total {money(total)}
            </span>
          </div>

          {/* datos del cliente */}
          <div className="mt-5">
            <label className="label" htmlFor="customerName">Nombre</label>
            <input
              id="customerName"
              name="customerName"
              className="field mb-3"
              placeholder="Tu nombre"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              className="field mb-4"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <button
              type="button"
              onClick={() => setOpen(true)}
              disabled={!contactReady}
              className="btn btn-primary w-full"
            >
              Continuar →
            </button>
          </div>

          <p className="text-xs mt-3 text-center" style={{ color: "var(--color-muted)" }}>
            Pago por ATH Móvil. Confirmamos tu orden al recibir el pago.
          </p>
        </>
      )}

      {/* Ventana: confirmar → "Hacer orden" → número de ATH Móvil */}
      {open && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ath-title"
        >
          <button
            type="button"
            aria-label="Cerrar"
            onClick={close}
            className="absolute inset-0 transition-opacity duration-200"
            style={{ background: "rgba(0,0,0,0.45)", opacity: shown ? 1 : 0 }}
          />
          <div
            className="relative w-full max-w-md card p-6 transition-all duration-200"
            style={{
              opacity: shown ? 1 : 0,
              transform: shown ? "scale(1)" : "scale(0.97)",
            }}
          >
            {!done ? (
              /* Paso confirmar */
              <>
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--color-teal-deep)" }}>
                  Revisa tu orden
                </span>
                <h2 id="ath-title" className="font-display text-2xl mt-1 mb-4">{product.name}</h2>

                <div className="rounded-xl p-4 mb-4" style={{ background: "var(--color-cream-2)", border: "1.5px solid var(--color-line)" }}>
                  <Row label={`Cantidad`} value={`${clampedQty}`} />
                  <Row label="Precio unidad" value={money(unitPrice)} />
                  <Row label="Envío" value={shipping > 0 ? money(shipping) : "Gratis"} />
                  <div className="h-px my-2" style={{ background: "var(--color-line)" }} />
                  <Row label="Total" value={money(total)} strong />
                </div>
                <p className="text-sm mb-4" style={{ color: "var(--color-ink-soft)" }}>
                  A nombre de <strong>{customerName}</strong> · {email}
                </p>

                {state.error && (
                  <p className="text-sm mb-3 font-semibold" style={{ color: "var(--color-coral-deep)" }}>
                    ⚠ {state.error}
                  </p>
                )}

                <form action={formAction}>
                  <input type="hidden" name="customerName" value={customerName} />
                  <input type="hidden" name="email" value={email} />
                  <input type="hidden" name="items" value={JSON.stringify(items)} />
                  <div className="flex gap-2">
                    <button type="button" onClick={close} className="btn btn-ghost flex-1" disabled={pending}>
                      Volver
                    </button>
                    <button type="submit" className="btn btn-primary flex-1" disabled={pending}>
                      {pending ? "Creando…" : "Hacer orden"}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Paso número de ATH Móvil */
              <>
                <div className="text-center">
                  <div className="text-4xl mb-2">✅</div>
                  <h2 id="ath-title" className="font-display text-2xl">¡Orden creada!</h2>
                  <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
                    Orden #{state.order!.id}
                  </p>
                </div>

                <div
                  className="rounded-xl p-5 my-4 text-center"
                  style={{ background: "var(--color-cream-2)", border: "2px solid var(--color-ink)" }}
                >
                  <p className="text-sm font-semibold" style={{ color: "var(--color-ink-soft)" }}>
                    Envía <strong>{money(state.order!.total)}</strong> por ATH Móvil a:
                  </p>
                  {athPhone ? (
                    <>
                      <p className="font-display text-3xl mt-2 tracking-tight" style={{ color: "var(--color-teal-deep)" }}>
                        {athPhone}
                      </p>
                      {athNombre && (
                        <p className="text-sm mt-1" style={{ color: "var(--color-ink-soft)" }}>
                          a nombre de <strong>{athNombre}</strong>
                        </p>
                      )}
                      <button type="button" onClick={copyPhone} className="btn btn-ghost btn-sm mt-3">
                        {copied ? "✓ Copiado" : "Copiar número"}
                      </button>
                    </>
                  ) : (
                    <p className="text-sm mt-2 font-semibold" style={{ color: "var(--color-coral-deep)" }}>
                      (Configura ATH_MOVIL_PHONE para mostrar el número)
                    </p>
                  )}
                </div>

                <p className="text-sm text-center" style={{ color: "var(--color-ink-soft)" }}>
                  Al recibir tu pago confirmamos la orden y te escribimos por email.
                </p>

                <button type="button" onClick={close} className="btn btn-ink w-full mt-5">
                  Listo
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-sm" style={{ color: "var(--color-ink-soft)" }}>{label}</span>
      <span className={strong ? "font-display text-lg" : "text-sm font-semibold"}>{value}</span>
    </div>
  );
}
