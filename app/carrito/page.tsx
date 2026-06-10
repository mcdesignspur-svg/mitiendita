import { getSessionBusiness } from "@/lib/auth";
import { CartView } from "@/components/cart-view";

export const metadata = { title: "Carrito — Mi Tiendita PR" };

export default async function CarritoPage() {
  const business = await getSessionBusiness();
  const isWholesale = business?.status === "verified";

  // CR-1: el carrito del cliente solo guarda {productId, qty}. CartView pide al
  // server que repricie esas líneas (priceCartAction → lib/pricing) para mostrar
  // precios reales; aquí solo pasamos la pista de sesión (kind/negocio).
  return (
    <div className="wrap py-12">
      <h1 className="font-display text-4xl md:text-5xl mb-8">Tu carrito 🛒</h1>
      <CartView
        kind={isWholesale ? "b2b" : "b2c"}
        businessId={isWholesale ? business?.id : undefined}
        businessName={isWholesale ? business?.businessName : undefined}
      />
    </div>
  );
}
