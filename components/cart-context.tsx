"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface CartLine {
  productId: string;
  slug: string;
  name: string;
  emoji: string;
  unitPrice: number;
  shippingPrice: number;
  qty: number;
}

interface CartCtx {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);
const KEY = "mt_cart_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setLines(JSON.parse(raw));
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
    const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    return {
      lines,
      count,
      subtotal,
      add: (line, qty = 1) =>
        setLines((prev) => {
          const i = prev.findIndex((l) => l.productId === line.productId);
          if (i >= 0) {
            const next = [...prev];
            next[i] = {
              ...next[i],
              qty: next[i].qty + qty,
              unitPrice: line.unitPrice,
              shippingPrice: line.shippingPrice,
            };
            return next;
          }
          return [...prev, { ...line, qty }];
        }),
      setQty: (productId, qty) =>
        setLines((prev) =>
          prev
            .map((l) => (l.productId === productId ? { ...l, qty: Math.max(0, qty) } : l))
            .filter((l) => l.qty > 0),
        ),
      remove: (productId) => setLines((prev) => prev.filter((l) => l.productId !== productId)),
      clear: () => setLines([]),
    };
  }, [lines]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
