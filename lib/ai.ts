/**
 * Núcleo de AI de Mi Tiendita PR.
 *
 * Todo pasa por el Vercel AI Gateway con strings "proveedor/modelo".
 * Si existe AI_GATEWAY_API_KEY usa el modelo real (generateObject con schema
 * zod = salida estructurada confiable). Si no, cada función cae a un resultado
 * determinista local — la app entera funciona sin ninguna API key
 * (degradación elegante). Cambia el modelo con AI_MODEL.
 */
import { z } from "zod";
import type { Segment, Badge } from "./types";

export const AI_MODEL = process.env.AI_MODEL || "anthropic/claude-sonnet-4-6";

/** True cuando hay key para usar el modelo real (vía Vercel AI Gateway). */
export function aiEnabled(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY);
}

/**
 * Helper central: genera un objeto tipado contra un schema zod.
 * Devuelve null si no hay key o si algo falla, para que cada caller caiga a su
 * fallback determinista.
 */
async function runObject<S extends z.ZodTypeAny>(
  schema: S,
  args: { system?: string; prompt: string; temperature?: number },
): Promise<z.infer<S> | null> {
  if (!aiEnabled()) return null;
  try {
    const { generateObject } = await import("ai");
    const { object } = await generateObject({
      model: AI_MODEL,
      schema,
      system: args.system,
      prompt: args.prompt,
      temperature: args.temperature ?? 0.6,
    });
    return object as z.infer<S>;
  } catch {
    return null;
  }
}

const SEGMENTS = ["gasolineras", "farmacias", "minimarkets", "individuos"] as const;
const BADGES = ["viral", "nuevo", "top"] as const;

/**
 * Regla de surtido del negocio (se inyecta en los prompts de sourcing/ficha).
 * Las farmacias son un CANAL de conveniencia: venden el mismo tipo de producto
 * viral / de alta utilidad / de impulso que las gasolineras y los mini-markets.
 * NO son de belleza, bienestar ni suplementos.
 */
export const SURTIDO_RULE =
  'Mi Tiendita PR vende productos virales / de alta utilidad / de impulso (tech, gadgets, accesorios de carro, hogar viral, conveniencia). Los tres canales de negocio —gasolineras, mini-markets y FARMACIAS— venden el MISMO tipo de productos de conveniencia/impulso. Las farmacias aquí son un canal de conveniencia: NO vendas para ellas productos de belleza, bienestar, skincare, suplementos ni salud. Nunca propongas productos de belleza/bienestar/suplementos/salud.';

// ===========================================================================
// 1) Copy de marketing
// ===========================================================================
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

const CopySchema = z.object({
  headline: z.string(),
  caption: z.string().describe("1-2 emojis incluidos"),
  hashtags: z.array(z.string()).describe("4-6 hashtags"),
  bullets: z.array(z.string()).describe("3 bullets de venta"),
});

export async function generateMarketingCopy(input: CopyInput): Promise<CopyResult> {
  const ai = await runObject(CopySchema, {
    system:
      'Eres el equipo de marketing de "Mi Tiendita PR", tienda boricua de productos importados virales. Escribe en español boricua: energético, cercano y vendedor.',
    prompt: `Genera copy de redes para este producto.
Producto: ${input.name}
Categoría: ${input.category}
Audiencia: ${input.audience}
Tono: ${input.tone || "energético, cercano, vendedor"}`,
    temperature: 0.85,
  });
  if (ai) return { source: "ai", ...ai };
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

// ===========================================================================
// 2) Scoring de sourcing (puro, sin AI)
// ===========================================================================
/**
 * Estima qué tan buen candidato viral es un producto a partir de señales.
 * Combina margen, tendencia y fricción logística en un score 0..100.
 */
export function viralScore(opts: { margin: number; trend: number; shipping: number }): number {
  const score = opts.margin * 0.5 + opts.trend * 0.4 - opts.shipping * 0.1;
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

// ===========================================================================
// 3) Borrador de producto (autocompletar en el admin)
// ===========================================================================
export interface ProductDraftInput {
  name: string;
  sourceUrl?: string;
  landedCost?: number;
  category?: string;
  hint?: string;
}
export interface ProductDraft {
  source: "ai" | "plantilla";
  name: string;
  emoji: string;
  category: string;
  tagline: string;
  description: string;
  tags: string[];
  segments: Segment[];
  badges: Badge[];
  retail: number;
  wholesale: number;
  moq: number;
  unitsPerCase: number;
  landedCost: number;
  shippingPrice: number;
}

const ProductDraftSchema = z.object({
  emoji: z.string().describe("Un solo emoji que represente el producto"),
  category: z.string().describe('Una de: "Auto & Gasolinera", "Tech & Gadgets", "Hogar Viral", "Impulso & Conveniencia" u otra apropiada (NO uses categorías de salud/belleza)'),
  tagline: z.string().describe("Una línea que engancha, máx ~70 caracteres"),
  description: z.string().describe("2-4 oraciones vendedoras en español boricua"),
  tags: z.array(z.string()).describe("3-6 etiquetas en minúscula, una palabra"),
  segments: z.array(z.enum(SEGMENTS)).describe("Segmentos a los que mejor le vende"),
  badges: z.array(z.enum(BADGES)),
  retail: z.number().describe("Precio al detal sugerido en USD"),
  wholesale: z.number().describe("Precio mayorista por unidad en USD"),
  moq: z.number().int().describe("Orden mínima mayorista (unidades)"),
  unitsPerCase: z.number().int().describe("Unidades por caja máster"),
});

export async function generateProductDraft(input: ProductDraftInput): Promise<ProductDraft> {
  const ai = await runObject(ProductDraftSchema, {
    system:
      `Eres el comprador y merchandiser de "Mi Tiendita PR" en Puerto Rico. Conviertes una idea de producto en una ficha lista para vender al detal (B2C) y al por mayor (B2B). Escribe en español boricua. Precios realistas para PR: retail típico 3-4x el costo importado; wholesale con margen sano para el negocio pero por encima del costo.\n${SURTIDO_RULE}`,
    prompt: `Producto: ${input.name}
${input.category ? `Categoría sugerida: ${input.category}\n` : ""}${input.landedCost ? `Costo importado por unidad: $${input.landedCost}\n` : ""}${input.sourceUrl ? `Enlace proveedor: ${input.sourceUrl}\n` : ""}${input.hint ? `Notas: ${input.hint}\n` : ""}Genera la ficha completa con precios y MOQ razonables.`,
    temperature: 0.7,
  });
  if (ai) {
    return {
      source: "ai",
      name: input.name,
      landedCost: input.landedCost ?? 0,
      shippingPrice: ai.retail >= 30 ? 6.99 : 3.99,
      ...ai,
    };
  }
  return templateProductDraft(input);
}

function priceEndingIn99(raw: number): number {
  if (raw <= 0) return 0;
  return Math.max(0.99, Math.round(raw) - 0.01);
}

function templateProductDraft(input: ProductDraftInput): ProductDraft {
  const cost = input.landedCost ?? 0;
  const retail = priceEndingIn99(cost * 3.2);
  const wholesale = priceEndingIn99(cost * 1.9);
  return {
    source: "plantilla",
    name: input.name,
    emoji: "📦",
    category: input.category || "General",
    tagline: `${input.name}: alta utilidad, alta rotación.`,
    description: `${input.name} — producto importado de alta demanda, ideal para vender al detal y al por mayor en Puerto Rico.`,
    tags: input.name.toLowerCase().split(" ").filter((w) => w.length > 3).slice(0, 4),
    segments: ["individuos", "minimarkets"],
    badges: ["nuevo"],
    retail,
    wholesale,
    moq: 12,
    unitsPerCase: 24,
    landedCost: cost,
    shippingPrice: retail >= 30 ? 6.99 : 3.99,
  };
}

// ===========================================================================
// 3b) Lluvia de candidatos de sourcing (botón "descubrir" en el panel)
// ===========================================================================
export interface BrainstormCandidate {
  name: string;
  emoji: string;
  category: string;
  supplier: string;
  unitCost: number;
  estRetail: number;
  estWholesale: number;
  moq: number;
  trend: number;
  shipping: number;
  signal: string;
}

const BrainstormSchema = z.object({
  candidates: z.array(
    z.object({
      name: z.string(),
      emoji: z.string().describe("un solo emoji"),
      category: z.string(),
      supplier: z.string().describe("nombre plausible de fábrica/suplidor en Alibaba"),
      unitCost: z.number().describe("costo importado estimado por unidad, USD"),
      estRetail: z.number().describe("retail estimado, USD"),
      estWholesale: z.number().describe("mayorista estimado por unidad, USD"),
      moq: z.number().int(),
      trend: z.number().min(0).max(1),
      shipping: z.number().min(0).max(1).describe("fricción logística; más alto = más difícil de traer"),
      signal: z.string().describe("la señal/oportunidad en una línea"),
    }),
  ),
});

export async function brainstormCandidates(input: {
  brief: string;
  count?: number;
}): Promise<{ source: "ai" | "vacio"; candidates: BrainstormCandidate[] }> {
  const ai = await runObject(BrainstormSchema, {
    system:
      `Eres el comprador de "Mi Tiendita PR" en Puerto Rico. Propones productos importados virales / de alta utilidad con buen potencial en PR para vender al detal y al por mayor (gasolineras, farmacias, mini-markets, individuos). Da costos y precios realistas; retail típico 3-4x el costo importado.\n${SURTIDO_RULE}`,
    prompt: `Propón ${input.count ?? 4} candidatos de sourcing para este brief:\n"${input.brief || "productos virales de alta rotación para Puerto Rico"}"\nVaría categorías y rangos de precio. Sé concreto y realista.`,
    temperature: 0.9,
  });
  if (ai) return { source: "ai", candidates: ai.candidates };
  return { source: "vacio", candidates: [] };
}

// ===========================================================================
// 4) Copiloto de verificación B2B
// ===========================================================================
export interface BusinessLike {
  businessName: string;
  type: string;
  contactName: string;
  email: string;
  phone: string;
  municipio: string;
  registroComerciante: string;
}
export interface BusinessAssessment {
  source: "ai" | "heuristica";
  recommendation: "aprobar" | "rechazar" | "revisar";
  confidence: number; // 0..100
  reasons: string[];
  flags: string[];
}

const AssessmentSchema = z.object({
  recommendation: z.enum(["aprobar", "rechazar", "revisar"]),
  confidence: z.number().min(0).max(100),
  reasons: z.array(z.string()).describe("2-4 razones claras"),
  flags: z.array(z.string()).describe("banderas de riesgo; vacío si no hay"),
});

export async function assessBusiness(b: BusinessLike): Promise<BusinessAssessment> {
  const ai = await runObject(AssessmentSchema, {
    system:
      'Eres el oficial de verificación B2B de "Mi Tiendita PR". Evalúas solicitudes de negocios en Puerto Rico que piden precios mayoristas. Verificas coherencia entre el nombre del negocio, su tipo, el municipio (debe ser de PR) y el formato del Número de Registro de Comerciante de Hacienda PR. No tienes acceso a bases externas: evalúas coherencia y señales de riesgo. Sé práctico: la mayoría de negocios legítimos deben aprobarse.',
    prompt: `Negocio: ${b.businessName}
Tipo declarado: ${b.type}
Contacto: ${b.contactName}
Email: ${b.email}
Teléfono: ${b.phone}
Municipio: ${b.municipio}
Registro de Comerciante: ${b.registroComerciante}`,
    temperature: 0.3,
  });
  if (ai) return { source: "ai", ...ai };
  return heuristicAssessment(b);
}

function heuristicAssessment(b: BusinessLike): BusinessAssessment {
  const reasons: string[] = [];
  const flags: string[] = [];
  const reg = b.registroComerciante.replace(/[^0-9A-Za-z]/g, "");
  if (reg.length >= 8) reasons.push("El Registro de Comerciante tiene un largo plausible.");
  else flags.push("El Registro de Comerciante parece corto o incompleto.");

  const freeDomains = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com", "icloud.com"];
  const domain = b.email.split("@")[1]?.toLowerCase() ?? "";
  if (domain && !freeDomains.includes(domain)) reasons.push("Usa email de dominio propio.");
  else flags.push("Usa email gratuito (no de dominio propio).");

  if (b.phone.replace(/[^0-9]/g, "").length >= 10) reasons.push("Teléfono con largo válido.");
  else flags.push("Teléfono incompleto.");

  if (b.municipio) reasons.push(`Municipio declarado: ${b.municipio}.`);

  const recommendation: BusinessAssessment["recommendation"] = flags.length === 0 ? "aprobar" : "revisar";
  const confidence = Math.max(20, 80 - flags.length * 20);
  return { source: "heuristica", recommendation, confidence, reasons, flags };
}

// ===========================================================================
// 5) Outreach a suplidores (lo redacto yo como operador, o desde el admin)
// ===========================================================================
export interface OutreachInput {
  supplierName: string;
  platform?: string;
  productName?: string;
  targetMoq?: number;
  channel?: "email" | "whatsapp";
  language?: "es" | "en";
}
export interface OutreachDraft {
  source: "ai" | "plantilla";
  subject: string;
  body: string;
}

const OutreachSchema = z.object({ subject: z.string(), body: z.string() });

export async function draftSupplierOutreach(input: OutreachInput): Promise<OutreachDraft> {
  const lang = input.language ?? "en";
  const ai = await runObject(OutreachSchema, {
    system:
      'You are the sourcing manager for "Mi Tiendita PR", a Puerto Rico retail/wholesale importer. You write concise, professional first-contact messages to overseas suppliers (Alibaba/1688) requesting quote, MOQ, lead time, samples, and shipping to Puerto Rico (USA). Friendly but business-like.',
    prompt: `Write a first-contact ${input.channel ?? "email"} in ${lang === "en" ? "English" : "Spanish"} to supplier "${input.supplierName}"${input.platform ? ` on ${input.platform}` : ""}.
Product of interest: ${input.productName ?? "their trending products"}.
Ask for: unit price at MOQ ${input.targetMoq ?? 100}, price breaks at higher volume, lead time, sample cost, and shipping options to Puerto Rico (USA). Keep it short.`,
    temperature: 0.6,
  });
  if (ai) return { source: "ai", ...ai };
  return templateOutreach(input);
}

function templateOutreach(input: OutreachInput): OutreachDraft {
  const moq = input.targetMoq ?? 100;
  const product = input.productName ?? "your trending products";
  return {
    source: "plantilla",
    subject: `Wholesale inquiry — ${product} (Puerto Rico, USA)`,
    body: `Hello ${input.supplierName},

I'm a retail/wholesale importer in Puerto Rico (USA) interested in ${product}. Could you please share:

1. Unit price at MOQ ${moq} (and price breaks at higher volume)
2. Lead time for production
3. Sample cost and how to order one
4. Shipping options and cost to Puerto Rico (USA)

Looking forward to building a long-term relationship.

Best regards,
Mi Tiendita PR`,
  };
}

// ===========================================================================
// 6) Asistente de compras (tienda pública)
// ===========================================================================
export interface AssistantProduct {
  slug: string;
  name: string;
  category: string;
  tagline: string;
  price: number;
}
export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}
export interface AssistantResult {
  source: "ai" | "busqueda";
  reply: string;
  productSlugs: string[];
}

const AssistantSchema = z.object({
  reply: z.string().describe("Respuesta corta y útil en español boricua, máx 3-4 oraciones"),
  productSlugs: z.array(z.string()).describe("slugs de 0-4 productos recomendados, tomados del catálogo dado"),
});

export async function shopAssistant(input: {
  message: string;
  history?: AssistantTurn[];
  catalog: AssistantProduct[];
}): Promise<AssistantResult> {
  const catalogText = input.catalog
    .map((p) => `- [${p.slug}] ${p.name} (${p.category}) — ${p.tagline} · $${p.price}`)
    .join("\n");
  const histText = (input.history ?? [])
    .slice(-6)
    .map((h) => `${h.role === "user" ? "Cliente" : "Asistente"}: ${h.content}`)
    .join("\n");

  const ai = await runObject(AssistantSchema, {
    system: `Eres el asistente de compras de "Mi Tiendita PR", tienda boricua de productos virales importados. Ayudas a clientes a encontrar productos del catálogo, contestas dudas y recomiendas. SOLO recomiendas productos que aparecen en el catálogo (usa sus slugs exactos). Si no hay match, dilo con honestidad y sugiere una categoría. Español boricua, cercano y breve.

CATÁLOGO:
${catalogText}`,
    prompt: `${histText ? histText + "\n" : ""}Cliente: ${input.message}`,
    temperature: 0.5,
  });

  if (ai) {
    const valid = new Set(input.catalog.map((p) => p.slug));
    return {
      source: "ai",
      reply: ai.reply,
      productSlugs: ai.productSlugs.filter((s) => valid.has(s)).slice(0, 4),
    };
  }
  return keywordAssistant(input);
}

function keywordAssistant(input: { message: string; catalog: AssistantProduct[] }): AssistantResult {
  const words = input.message
    .toLowerCase()
    .split(/[^a-záéíóúñ0-9]+/i)
    .filter((w) => w.length > 3);
  const scored = input.catalog
    .map((p) => {
      const hay = `${p.name} ${p.category} ${p.tagline}`.toLowerCase();
      const score = words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
  const slugs = scored.map((x) => x.p.slug);
  const reply = slugs.length
    ? "Mira lo que tenemos que te puede servir 👇"
    : "Cuéntame un poco más de lo que buscas (para el carro, la casa, tecnología, conveniencia…) y te recomiendo algo del catálogo.";
  return { source: "busqueda", reply, productSlugs: slugs };
}
