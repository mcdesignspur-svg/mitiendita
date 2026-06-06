import { NextResponse } from "next/server";
import { listProducts } from "@/lib/db";
import { effectiveRetail } from "@/lib/products";
import { shopAssistant, type AssistantTurn } from "@/lib/ai";

export const runtime = "nodejs";

/**
 * Asistente de compras de la tienda pública (B2C). Recibe el mensaje + historial,
 * le pasa el catálogo activo al cerebro AI y devuelve respuesta + productos
 * recomendados (con todo lo necesario para añadirlos al carrito).
 */
export async function POST(req: Request) {
  let body: { message?: string; history?: AssistantTurn[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const message = String(body.message ?? "").slice(0, 500).trim();
  if (!message) return NextResponse.json({ error: "Escribe un mensaje." }, { status: 400 });

  const products = await listProducts({ activeOnly: true });
  const catalog = products.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: p.category,
    tagline: p.tagline,
    price: effectiveRetail(p),
  }));

  const result = await shopAssistant({
    message,
    history: Array.isArray(body.history) ? body.history : [],
    catalog,
  });

  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const recommended = result.productSlugs
    .map((slug) => bySlug.get(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      emoji: p.emoji,
      imageUrl: p.imageUrl ?? null,
      gradient: p.gradient,
      unitPrice: effectiveRetail(p),
      shippingPrice: p.shippingPrice ?? 0,
    }));

  return NextResponse.json({ reply: result.reply, source: result.source, products: recommended });
}
