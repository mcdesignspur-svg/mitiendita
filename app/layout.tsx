import type { Metadata, Viewport } from "next";
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
  metadataBase: new URL("https://mitienditapr.com"),
  title: {
    default: "Mi Tiendita PR — Productos virales importados",
    template: "%s — Mi Tiendita PR",
  },
  description:
    "Productos importados de alta utilidad y virales para individuos, gasolineras, farmacias y mini-markets en Puerto Rico. Precios especiales para negocios con Registro de Comerciante.",
  openGraph: {
    siteName: "Mi Tiendita PR",
    locale: "es_PR",
    type: "website",
    title: "Mi Tiendita PR — Productos virales importados",
    description:
      "Productos importados de alta utilidad y virales para individuos, gasolineras, farmacias y mini-markets en Puerto Rico.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mi Tiendita PR — Productos virales importados",
    description:
      "Productos importados de alta utilidad y virales para individuos, gasolineras, farmacias y mini-markets en Puerto Rico.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf6ec",
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

  // Solo mostramos hints de demo fuera de producción
  const showDemo = process.env.NODE_ENV !== "production";

  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable}`}>
        <CartProvider>
          <Header session={session} />
          <main>{children}</main>
          <Footer />
          <ShopAssistant showDemo={showDemo} />
        </CartProvider>
      </body>
    </html>
  );
}
