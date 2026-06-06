"use client";

import { useEffect } from "react";
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
      try {
        await w.findPaymentATHM();
      } catch {
        /* ignore */
      }
      router.push(`/carrito?ath=cancelado`);
    };

    w.expiredATHM = async function () {
      try {
        await w.findPaymentATHM();
      } catch {
        /* ignore */
      }
      router.push(`/carrito?ath=expirado`);
    };

    const script = document.createElement("script");
    script.src = "https://payments.athmovil.com/api/modal/js/athmovil_base.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, [order, publicToken, phone, router]);

  return <div id="ATHMovil_Checkout_Button_payment" className="flex justify-center" />;
}
