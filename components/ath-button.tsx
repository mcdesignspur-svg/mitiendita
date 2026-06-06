"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export interface AthOrder {
  id: string;
  total: number;
  shipping: number;
  email: string;
  items: { name: string; qty: number; unitPrice: number }[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function AthButton({
  order,
  publicToken,
  phone,
}: {
  order: AthOrder;
  publicToken: string;
  phone: string;
}) {
  const router = useRouter();
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const w = window as any;

    const items = order.items.map((it) => ({
      name: it.name.slice(0, 60),
      description: "",
      quantity: String(it.qty),
      price: it.unitPrice.toFixed(2),
      tax: null,
      metadata: null,
    }));
    if (order.shipping > 0) {
      items.push({ name: "Envío", description: "", quantity: "1", price: order.shipping.toFixed(2), tax: null, metadata: null });
    }

    w.ATHM_Checkout = {
      env: "production",
      publicToken,
      timeout: 600,
      theme: "btn",
      lang: "es",
      total: Number(order.total.toFixed(2)),
      subtotal: Number(order.total.toFixed(2)),
      tax: 0,
      metadata1: order.id.slice(0, 40),
      metadata2: order.email.slice(0, 40),
      items,
      phoneNumber: phone,
    };

    w.authorizationATHM = async function () {
      try {
        const response = await w.authorization();
        await fetch("/api/ath/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId: order.id, response }),
        });
      } catch {
        /* el webhook confirmará de todas formas */
      }
      router.push(`/carrito/gracias?o=${order.id}`);
    };
    w.cancelATHM = async function () {
      try { await w.findPaymentATHM(); } catch { /* ignore */ }
      router.push(`/carrito?ath=cancelado`);
    };
    w.expiredATHM = async function () {
      try { await w.findPaymentATHM(); } catch { /* ignore */ }
      router.push(`/carrito?ath=expirado`);
    };

    // La librería de ATH Móvil renderiza el botón en el evento load/DOMContentLoaded.
    // Como inyectamos el script tras la navegación SPA (ese evento ya ocurrió),
    // re-disparamos los eventos para que su inicializador corra.
    function triggerInit() {
      try { document.dispatchEvent(new Event("DOMContentLoaded")); } catch { /* */ }
      try { window.dispatchEvent(new Event("load")); } catch { /* */ }
    }

    const SRC = "https://payments.athmovil.com/api/modal/js/athmovil_base.js";
    const existing = document.getElementById("athmovil-base") as HTMLScriptElement | null;
    if (existing) {
      triggerInit();
    } else {
      const script = document.createElement("script");
      script.id = "athmovil-base";
      script.src = SRC;
      script.async = true;
      script.onload = triggerInit;
      document.body.appendChild(script);
    }

    // Si el botón no aparece (cuenta pendiente de verificación), mostramos aviso.
    const t = setTimeout(() => {
      const el = document.getElementById("ATHMovil_Checkout_Button_payment");
      if (!el || el.childElementCount === 0) setFallback(true);
    }, 6000);

    return () => clearTimeout(t);
  }, [order, publicToken, phone, router]);

  return (
    <>
      <div id="ATHMovil_Checkout_Button_payment" className="flex justify-center min-h-[3.5rem]" />
      {fallback && (
        <p
          className="text-sm mt-4 rounded-xl px-4 py-3 text-left"
          style={{ background: "#fff7e6", color: "#a06b00", border: "1.5px solid #ffd98a" }}
        >
          ⏳ El botón de ATH Móvil aparecerá cuando tu cuenta <strong>ATH Móvil Business</strong> esté
          verificada y activa. Por ahora está <strong>pendiente de verificación</strong> por Evertec —
          mientras tanto puedes pagar con <strong>tarjeta</strong>.
        </p>
      )}
    </>
  );
}
