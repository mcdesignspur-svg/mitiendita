/**
 * Generador de copy de marketing AI-first.
 *
 * Si existe AI_GATEWAY_API_KEY, usa el Vercel AI Gateway (modelo Anthropic).
 * Si no, cae a una plantilla local determinista — la app funciona igual sin
 * ninguna API key. Este es el patrón "degradación elegante" para demos.
 */

export interface CopyInput {
  name: string;
  category: string;
  audience: string;
  tone?: string;
}

export interface CopyResult {
  source: "ai" | "plantilla";
  headline: string;
  caption: string;
  hashtags: string[];
  bullets: string[];
}

export async function generateMarketingCopy(input: CopyInput): Promise<CopyResult> {
  if (process.env.AI_GATEWAY_API_KEY) {
    try {
      const { generateText } = await import("ai");
      const prompt = `Eres el equipo de marketing de "Mi Tiendita PR", una tienda en Puerto Rico de productos importados virales.
Genera copy de redes sociales en español boricua para este producto.
Producto: ${input.name}
Categoría: ${input.category}
Audiencia: ${input.audience}
Tono: ${input.tone || "energético, cercano, vendedor"}

Responde SOLO con JSON válido con esta forma exacta:
{"headline": "...", "caption": "... con 1-2 emojis ...", "hashtags": ["#...","#..."], "bullets": ["...","...","..."]}`;

      const { text } = await generateText({
        model: "anthropic/claude-sonnet-4-6",
        prompt,
        temperature: 0.85,
      });

      const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
      const parsed = JSON.parse(json) as Omit<CopyResult, "source">;
      return { source: "ai", ...parsed };
    } catch {
      // cae a plantilla
    }
  }
  return templateCopy(input);
}

function templateCopy(input: CopyInput): CopyResult {
  const first = input.name.split(" ").slice(0, 3).join(" ");
  return {
    source: "plantilla",
    headline: `${first} — el producto que todos están buscando 🔥`,
    caption: `🚨 Llegó ${input.name} a Mi Tiendita PR. Perfecto para ${input.audience.toLowerCase()}. Calidad importada, precio de aquí. ¡Pídelo hoy y te lo llevamos! 🇵🇷`,
    hashtags: [
      "#MiTienditaPR",
      "#ProductosVirales",
      "#PuertoRico",
      `#${input.category.replace(/[^A-Za-zÀ-ÿ]/g, "")}`,
      "#CompraLocal",
    ],
    bullets: [
      `Ideal para ${input.audience.toLowerCase()}`,
      "Importado y de alta rotación",
      "Disponible al detal y al por mayor para negocios",
    ],
  };
}

/**
 * Scoring de sourcing: estima qué tan buen candidato viral es un producto.
 * En producción esto combina señales (tendencias, margen, reseñas, MOQ).
 */
export function viralScore(opts: {
  margin: number;
  trend: number;
  shipping: number;
}): number {
  const score = opts.margin * 0.5 + opts.trend * 0.4 - opts.shipping * 0.1;
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}
