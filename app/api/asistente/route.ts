import { NextResponse } from "next/server";
import { z } from "zod";
import { listProducts } from "@/lib/db";
import { effectiveRetail } from "@/lib/products";
import { shopAssistant, type AssistantTurn } from "@/lib/ai";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Asistente de compras de la tienda pública (B2C). Recibe el mensaje + historial,
 * le pasa el catálogo activo al cerebro AI y devuelve respuesta + productos
 * recomendados (con todo lo necesario para añadirlos al carrito).
 *
 * Límite: 10 req/min por IP (A-12 — denial-of-wallet).
 * Historial: máx 6 turnos, cada mensaje capado a 500 chars.
 */

/** Schema zod para validar el historial del cuerpo del request. */
const TurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(500),
});
const BodySchema = z.object({
  message: z.string().max(500).optional(),
  history: z.array(TurnSchema).max(20).optional(), // el server recorta a 6 abajo
});

export async function POST(req: Request) {
  // --- Rate limit (A-12) ---
  const forwarded = req.headers.get("x-forwarded-for") ?? "unknown";
  const ip = forwarded.split(",")[0].trim();
  const rl = rateLimit(`asistente:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento y vuelve a intentar." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)),
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // --- Parse y validación del body ---
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const body = parsed.data;

  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Escribe un mensaje." }, { status: 400 });

  // Recorta el historial: solo últimos 6 turnos, cada content ya viene capado a 500 por el schema.
  const history: AssistantTurn[] = (body.history ?? []).slice(-6);

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
    history,
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
