// Aritmética de dinero centralizada para evitar el arrastre de floats
// (0.1 + 0.2 = 0.30000000000000004) en totales de órdenes y comparaciones de pago.

/** Redondea a 2 decimales (centavos). */
export function money2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Convierte dólares a centavos enteros (p. ej. para `unit_amount` de Stripe). */
export function toCents(n: number): number {
  return Math.round(n * 100);
}
