import { viralScore } from "./ai";

export type SourcingStage = "Detectado" | "Evaluando" | "Negociando" | "Ordenado";

export interface SourcingCandidate {
  id: string;
  name: string;
  emoji: string;
  supplier: string;
  unitCost: number;
  estRetail: number;
  trend: number; // 0..1 señal de tendencia
  shipping: number; // 0..1 fricción logística
  stage: SourcingStage;
  signal: string;
}

/**
 * Candidatos del pipeline de sourcing (Alibaba → scoring AI → decisión de importar).
 * En producción esto lo alimentan agentes que rastrean tendencias y catálogos de proveedores.
 */
export const SOURCING_CANDIDATES: SourcingCandidate[] = [
  {
    id: "s-1",
    name: "Proyector LED Astronauta",
    emoji: "🌌",
    supplier: "Shenzhen Glow Co.",
    unitCost: 6.8,
    estRetail: 27.99,
    trend: 0.92,
    shipping: 0.3,
    stage: "Negociando",
    signal: "+340% búsquedas TikTok PR (30d)",
  },
  {
    id: "s-2",
    name: "Mini Impresora Térmica de Bolsillo",
    emoji: "🖨️",
    supplier: "Guangzhou PrintTech",
    unitCost: 9.2,
    estRetail: 34.99,
    trend: 0.81,
    shipping: 0.35,
    stage: "Evaluando",
    signal: "Tendencia estable, alto ticket",
  },
  {
    id: "s-3",
    name: "Aspiradora de Carro Inalámbrica",
    emoji: "🚗",
    supplier: "Ningbo AutoCare",
    unitCost: 11.5,
    estRetail: 39.99,
    trend: 0.74,
    shipping: 0.45,
    stage: "Detectado",
    signal: "Encaja con góndola de gasolinera",
  },
  {
    id: "s-4",
    name: "Humidificador Llama LED",
    emoji: "🔥",
    supplier: "Yiwu HomeVibe",
    unitCost: 4.3,
    estRetail: 19.99,
    trend: 0.88,
    shipping: 0.25,
    stage: "Ordenado",
    signal: "Viral en reels · recompra alta",
  },
  {
    id: "s-5",
    name: "Lámpara de Cuello para Lectura",
    emoji: "💡",
    supplier: "Shenzhen BrightWear",
    unitCost: 3.1,
    estRetail: 14.99,
    trend: 0.66,
    shipping: 0.2,
    stage: "Evaluando",
    signal: "Margen alto, bajo costo de envío",
  },
  {
    id: "s-6",
    name: "Set Organizadores de Nevera (8pz)",
    emoji: "🧊",
    supplier: "Taizhou ClearHome",
    unitCost: 7.9,
    estRetail: 29.99,
    trend: 0.59,
    shipping: 0.5,
    stage: "Detectado",
    signal: "Demanda constante en hogar",
  },
];

export function scoreFor(c: SourcingCandidate): number {
  const margin = (c.estRetail - c.unitCost) / c.estRetail;
  return viralScore({ margin, trend: c.trend, shipping: c.shipping });
}
