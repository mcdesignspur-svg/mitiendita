import type { Metadata } from "next";
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/cart-context";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { ShopAssistant } from "@/components/shop-assistant";
import { getSessionBusiness } from "@/lib/auth";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mi Tiendita PR — Productos virales importados | Al detal y al por mayor",
  description:
    "Productos importados de alta utilidad y virales para individuos, gasolineras, farmacias y mini-markets en Puerto Rico. Precios especiales para negocios con Registro de Comerciante.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const business = await getSessionBusiness();
  const session = business
    ? { id: business.id, businessName: business.businessName, status: business.status }
    : null;

  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable}`}>
        <CartProvider>
          <Header session={session} />
          <main>{children}</main>
          <Footer />
          <ShopAssistant />
        </CartProvider>
      </body>
    </html>
  );
}
