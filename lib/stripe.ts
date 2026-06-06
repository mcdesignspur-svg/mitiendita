import Stripe from "stripe";

/**
 * Cliente de Stripe (lazy). No se inicializa hasta el primer uso, así el
 * build/import no falla si falta STRIPE_SECRET_KEY. Sin la key, el checkout
 * cae al modo demo (orden registrada sin cobro) — degradación elegante.
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY no está configurado.");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/** True cuando Stripe está configurado (hay secret key). */
export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
