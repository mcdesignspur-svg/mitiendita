import { viralScore } from "./ai";
import type { SourcingCandidate, Supplier } from "./types";

export type { SourcingCandidate, SourcingStage } from "./types";

/**
 * Candidatos semilla del pipeline de sourcing. En producción esto lo alimenta
 * Claude (agente operador) investigando tendencias y catálogos de proveedores,
 * y se guarda en la base de datos vía lib/operator.ts. Esta lista solo siembra
 * el store la primera vez.
 */
export const SEED_CANDIDATES: SourcingCandidate[] = [
  {
    id: "s-1",
    name: "Proyector LED Astronauta",
    emoji: "🌌",
    category: "Hogar Viral",
    supplier: "Shenzhen Glow Co.",
    unitCost: 6.8,
    estRetail: 27.99,
    estWholesale: 13.5,
    moq: 24,
    trend: 0.92,
    shipping: 0.3,
    stage: "Negociando",
    signal: "+340% búsquedas TikTok PR (30d)",
    origin: "agente",
    createdAt: "2026-05-28T12:00:00.000Z",
  },
  {
    id: "s-2",
    name: "Mini Impresora Térmica de Bolsillo",
    emoji: "🖨️",
    category: "Tech & Gadgets",
    supplier: "Guangzhou PrintTech",
    unitCost: 9.2,
    estRetail: 34.99,
    estWholesale: 17.5,
    moq: 12,
    trend: 0.81,
    shipping: 0.35,
    stage: "Evaluando",
    signal: "Tendencia estable, alto ticket",
    origin: "agente",
    createdAt: "2026-05-29T12:00:00.000Z",
  },
  {
    id: "s-3",
    name: "Aspiradora de Carro Inalámbrica",
    emoji: "🚗",
    category: "Auto & Gasolinera",
    supplier: "Ningbo AutoCare",
    unitCost: 11.5,
    estRetail: 39.99,
    estWholesale: 19.9,
    moq: 12,
    trend: 0.74,
    shipping: 0.45,
    stage: "Detectado",
    signal: "Encaja con góndola de gasolinera",
    origin: "agente",
    createdAt: "2026-05-30T12:00:00.000Z",
  },
  {
    id: "s-4",
    name: "Humidificador Llama LED",
    emoji: "🔥",
    category: "Hogar Viral",
    supplier: "Yiwu HomeVibe",
    unitCost: 4.3,
    estRetail: 19.99,
    estWholesale: 8.5,
    moq: 36,
    trend: 0.88,
    shipping: 0.25,
    stage: "Ordenado",
    signal: "Viral en reels · recompra alta",
    origin: "agente",
    createdAt: "2026-05-31T12:00:00.000Z",
  },
  {
    id: "s-5",
    name: "Lámpara de Cuello para Lectura",
    emoji: "💡",
    category: "Hogar Viral",
    supplier: "Shenzhen BrightWear",
    unitCost: 3.1,
    estRetail: 14.99,
    estWholesale: 6.2,
    moq: 48,
    trend: 0.66,
    shipping: 0.2,
    stage: "Evaluando",
    signal: "Margen alto, bajo costo de envío",
    origin: "agente",
    createdAt: "2026-06-01T12:00:00.000Z",
  },
  {
    id: "s-6",
    name: "Set Organizadores de Nevera (8pz)",
    emoji: "🧊",
    category: "Hogar Viral",
    supplier: "Taizhou ClearHome",
    unitCost: 7.9,
    estRetail: 29.99,
    estWholesale: 14.5,
    moq: 12,
    trend: 0.59,
    shipping: 0.5,
    stage: "Detectado",
    signal: "Demanda constante en hogar",
    origin: "agente",
    createdAt: "2026-06-02T12:00:00.000Z",
  },
];

/** Suplidores semilla (en producción los investiga y contacta Claude). */
export const SEED_SUPPLIERS: Supplier[] = [
  {
    id: "sup-1",
    name: "Shenzhen Glow Co.",
    platform: "Alibaba",
    url: "https://www.alibaba.com/company/shenzhen-glow",
    country: "China",
    products: "Proyectores LED, luces ambientales, deco viral",
    status: "cotizando",
    notes: "Responde rápido. Cotizó el proyector astronauta a $6.80/u (MOQ 100).",
    createdAt: "2026-05-28T12:00:00.000Z",
  },
  {
    id: "sup-2",
    name: "Yiwu HomeVibe",
    platform: "Alibaba",
    country: "China",
    products: "Humidificadores, gadgets de hogar virales",
    status: "aprobado",
    notes: "Buen historial. Envío consolidado a PR vía Miami.",
    createdAt: "2026-05-31T12:00:00.000Z",
  },
];

/** Score 0..100 de un candidato a partir de margen, tendencia y logística. */
export function scoreFor(c: Pick<SourcingCandidate, "estRetail" | "unitCost" | "trend" | "shipping">): number {
  const margin = c.estRetail > 0 ? (c.estRetail - c.unitCost) / c.estRetail : 0;
  return viralScore({ margin, trend: c.trend, shipping: c.shipping });
}
