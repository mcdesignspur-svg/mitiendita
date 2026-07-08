import type { Product, Badge, Segment, Grupo } from "./types";

/**
 * Catálogo semilla. Se carga en el store la primera vez; a partir de ahí se
 * gestiona desde el panel de operación (/admin/productos).
 */
const RAW: Product[] = [
  {
    id: "p-thumbcamera",
    slug: "thumbcamera",
    name: "Best-selling Mini Thumb Camera G6 1080P Kodak Charmera 1984 Digital Camera MicroSD 10x-20x Optical Zoom CMOS Sensor Blind Box",
    emoji: "📷",
    gradient: "linear-gradient(135deg,#5b3fd6,#0fae9e)",
    category: "Tech & Gadgets",
    tagline:
      "Best-selling Mini Thumb Camera G6 1080P Kodak Charmera 1984 Digital Camera MicroSD 10x-20x Optical Zoom CMOS Sensor Blind Box: alta utilidad, alta rotación.",
    description:
      "1080P Video Resolution: The 1080P video resolution ensures high-quality and clear video recordings, making it suitable for detailed and professional use. 10x - 20x Optical Zoom: With a 10x to 20x optical zoom range, the camera can capture distant subjects with clarity, providing flexibility in various shooting scenarios. CMOS Image Sensor: The CMOS image sensor enhances image quality and performance, ensuring better low-light sensitivity and reduced noise in photos and videos.",
    retail: 30,
    wholesale: 14.5,
    moq: 12,
    unitsPerCase: 24,
    badges: ["viral", "nuevo"],
    tags: ["tech", "camera", "viral", "regalo"],
    segments: ["minimarkets", "individuos"],
    landedCost: 8.2,
    sourceUrl: "https://www.alibaba.com/product-detail/mini-thumb-camera-g6",
    stock: 120,
    shippingPrice: 3.99,
  },
];

/**
 * Grupos semilla (curaduría interna del catálogo). Se cargan junto con los
 * productos; a partir de ahí se gestionan desde /admin/grupos.
 */
export const SEED_GRUPOS: Grupo[] = [
  {
    id: "g-mas-vendidos",
    slug: "mas-vendidos",
    name: "Más Vendidos",
    emoji: "🔥",
    description: "Los productos que más rotan en góndola.",
    color: "var(--color-coral)",
    createdAt: "2026-05-20T14:00:00.000Z",
  },
  {
    id: "g-carro",
    slug: "imprescindibles-de-carro",
    name: "Imprescindibles de Carro",
    emoji: "🚗",
    description: "Accesorios de auto de alta rotación para gasolineras.",
    color: "var(--color-teal-deep)",
    createdAt: "2026-05-20T14:00:00.000Z",
  },
  {
    id: "g-verano",
    slug: "verano-boricua",
    name: "Verano Boricua",
    emoji: "🏝️",
    description: "Para el calor, la playa y los festivales.",
    color: "var(--color-sun)",
    createdAt: "2026-05-20T14:00:00.000Z",
  },
  {
    id: "g-emergencia",
    slug: "kit-de-emergencia",
    name: "Kit de Emergencia",
    emoji: "🔦",
    description: "Apagones y temporada de huracanes.",
    color: "var(--color-grape)",
    createdAt: "2026-05-20T14:00:00.000Z",
  },
];

// Asignación semilla de productos a grupos (por id de producto).
const GRUPOS_BY_PRODUCT: Record<string, string[]> = {
  "p-thumbcamera": ["g-mas-vendidos"],
};

/** Catálogo semilla normalizado con los campos de gestión de tienda. */
export const SEED_PRODUCTS: Product[] = RAW.map((p) => ({
  ...p,
  grupoIds: GRUPOS_BY_PRODUCT[p.id] ?? [],
  discountPercent: 0,
  shippingPrice: p.shippingPrice ?? (p.retail >= 30 ? 6.99 : 3.99),
  active: true,
}));

// --- Helpers de precio (puros, seguros para cliente) ---
export function effectiveRetail(p: Product): number {
  const d = p.discountPercent ?? 0;
  if (d <= 0) return p.retail;
  return Math.round(p.retail * (1 - d / 100) * 100) / 100;
}
export function hasDiscount(p: Product): boolean {
  return (p.discountPercent ?? 0) > 0;
}
export function isActive(p: Product): boolean {
  return p.active !== false;
}
export function shippingOf(p: Product): number {
  return p.shippingPrice ?? 0;
}
/**
 * Galería de fotos del producto (para el carrusel). Tolera productos viejos que
 * solo tienen `imageUrl`. La primera foto es la portada. Devuelve [] si no hay.
 */
export function productImages(p: Product): string[] {
  const list = (p.imageUrls ?? []).filter(Boolean);
  if (list.length) return list;
  return p.imageUrl ? [p.imageUrl] : [];
}

// --- Opciones para los formularios del admin ---
export const DEFAULT_CATEGORIES = [
  "Auto & Gasolinera",
  "Tech & Gadgets",
  "Impulso & Conveniencia",
  "Hogar Viral",
  "Juguetes & Coleccionables",
];

export const GRADIENT_PRESETS = [
  "linear-gradient(135deg,#ff5a36,#ffc53d)",
  "linear-gradient(135deg,#0fae9e,#0a7d72)",
  "linear-gradient(135deg,#5b3fd6,#0fae9e)",
  "linear-gradient(135deg,#1c1813,#5b3fd6)",
  "linear-gradient(135deg,#ffc53d,#ff5a36)",
  "linear-gradient(135deg,#0fae9e,#5b3fd6)",
  "linear-gradient(135deg,#ff5a36,#5b3fd6)",
  "linear-gradient(135deg,#0a7d72,#ffc53d)",
  "linear-gradient(135deg,#5b3fd6,#ff5a36)",
  "linear-gradient(135deg,#ffc53d,#0fae9e)",
  "linear-gradient(135deg,#1c1813,#0fae9e)",
  "linear-gradient(135deg,#0a7d72,#1c1813)",
];

export const BADGE_OPTIONS: { value: Badge; label: string }[] = [
  { value: "viral", label: "🔥 Viral" },
  { value: "nuevo", label: "Nuevo" },
  { value: "top", label: "★ Top" },
];

export const SEGMENT_OPTIONS: { value: Segment; label: string }[] = [
  { value: "individuos", label: "Individuos" },
  { value: "gasolineras", label: "Gasolineras" },
  { value: "farmacias", label: "Farmacias" },
  { value: "minimarkets", label: "Mini-markets" },
];

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
