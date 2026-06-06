export function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Margen mayorista sobre costo importado. */
export function marginPct(price: number, cost: number): number {
  if (price <= 0) return 0;
  return (price - cost) / price;
}
