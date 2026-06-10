"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "./cart-context";

/**
 * "Volver a pedir": reposición de un clic sobre un pedido pasado. Añade las
 * mismas líneas (solo {productId, qty}) al carrito y lleva al checkout, donde
 * el server reprecia todo (precio mayorista vigente, stock, mínimo). Si algún
 * producto ya no está disponible, el repricing del carrito lo descarta y avisa.
 */
export function ReorderButton({
  items,
}: {
  items: { productId: string; qty: number }[];
}) {
  const { add } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  function handleReorder() {
    if (busy || items.length === 0) return;
    setBusy(true);
    for (const it of items) add(it.productId, it.qty);
    router.push("/carrito");
  }

  return (
    <button
      onClick={handleReorder}
      disabled={busy || items.length === 0}
      className="btn btn-ghost btn-sm"
    >
      {busy ? "Añadiendo…" : "🔁 Volver a pedir"}
    </button>
  );
}
