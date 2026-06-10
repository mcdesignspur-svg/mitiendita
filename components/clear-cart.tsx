"use client";

import { useEffect } from "react";
import { useCart } from "./cart-context";

/**
 * Vacía el carrito SOLO cuando el pedido está cerrado (`enabled`). M-11: si el
 * pago quedó pendiente, no vaciamos para que el cliente pueda reintentar sin
 * perder su carrito.
 */
export function ClearCart({ enabled = false }: { enabled?: boolean }) {
  const { clear } = useCart();
  useEffect(() => {
    if (enabled) clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  return null;
}
