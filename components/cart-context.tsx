"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * El carrito del cliente guarda SOLO intención: id de producto + cantidad
 * (M-10). NUNCA precios ni nombres — esos se derivan server-side en el checkout
 * y en la página del carrito (lib/pricing.ts). Así el navegador no puede
 * declarar el precio que paga.
 */
export interface CartLine {
  productId: string;
  qty: number;
}

interface CartCtx {
  lines: CartLine[];
  count: number;
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  /** True una vez hidratado desde localStorage (evita parpadeo SSR). */
  ready: boolean;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "mt_cart_v1";

/** Normaliza cualquier cosa guardada (incluye formatos viejos con precios). */
function sanitize(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const out: CartLine[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const productId = String(r.productId ?? "").trim();
    const qty = Math.max(0, Math.round(Number(r.qty) || 0));
    if (productId && qty > 0) {
      const i = out.findIndex((l) => l.productId === productId);
      if (i >= 0) out[i].qty += qty;
      else out.push({ productId, qty });
    }
  }
  return out;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // Hidratación intencional: localStorage solo existe en cliente, hay que
      // leerlo en un effect tras el montaje (evita mismatch SSR/CSR).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setLines(sanitize(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(lines));
  }, [lines, ready]);

  const api: CartCtx = useMemo(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    return {
      lines,
      count,
      ready,
      add: (productId, qty = 1) =>
        setLines((prev) => {
          const add = Math.max(1, Math.round(qty));
          const i = prev.findIndex((l) => l.productId === productId);
          if (i >= 0) {
            const next = [...prev];
            next[i] = { ...next[i], qty: next[i].qty + add };
            return next;
          }
          return [...prev, { productId, qty: add }];
        }),
      setQty: (productId, qty) =>
        setLines((prev) =>
          prev
            .map((l) => (l.productId === productId ? { ...l, qty: Math.max(0, Math.round(qty)) } : l))
            .filter((l) => l.qty > 0),
        ),
      remove: (productId) => setLines((prev) => prev.filter((l) => l.productId !== productId)),
      clear: () => setLines([]),
    };
  }, [lines, ready]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
