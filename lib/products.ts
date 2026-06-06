import type { Product, Badge, Segment } from "./types";

/**
 * Catálogo semilla. Se carga en el store la primera vez; a partir de ahí se
 * gestiona desde el panel de operación (/admin/productos).
 */
const RAW: Product[] = [
  {
    id: "p-001",
    slug: "bomba-aire-portatil-recargable",
    name: "Bomba de Aire Portátil Recargable",
    emoji: "🛞",
    gradient: "linear-gradient(135deg,#ff5a36,#ffc53d)",
    category: "Auto & Gasolinera",
    tagline: "Infla gomas, bicicletas y bolas en segundos. Pantalla digital.",
    description:
      "Compresor inalámbrico recargable por USB-C con pantalla digital y auto-apagado por presión. Incluye boquillas para autos, bicicletas y deportes. El accesorio que todo conductor termina comprando por impulso en la gasolinera.",
    retail: 39.99,
    wholesale: 21.5,
    moq: 12,
    unitsPerCase: 24,
    badges: ["viral", "top"],
    tags: ["carro", "emergencia", "verano", "impulso"],
    segments: ["gasolineras", "minimarkets", "individuos"],
    landedCost: 13.2,
    sourceUrl: "https://www.alibaba.com/product-detail/portable-air-pump",
    stock: 320,
  },
  {
    id: "p-002",
    slug: "soporte-magnetico-telefono-carro",
    name: "Soporte Magnético de Teléfono para Carro",
    emoji: "🧲",
    gradient: "linear-gradient(135deg,#0fae9e,#0a7d72)",
    category: "Auto & Gasolinera",
    tagline: "Agarre magnético súper fuerte. Instalación en 5 segundos.",
    description:
      "Soporte magnético con 6 imanes de neodimio y base adhesiva premium para el tablero o rejilla de aire. Gira 360°. Ideal para góndola de impulso al lado de la caja.",
    retail: 14.99,
    wholesale: 5.9,
    moq: 24,
    unitsPerCase: 48,
    badges: ["top"],
    tags: ["carro", "telefono", "impulso"],
    segments: ["gasolineras", "minimarkets"],
    landedCost: 2.85,
    sourceUrl: "https://www.alibaba.com/product-detail/magnetic-phone-holder",
    stock: 540,
  },
  {
    id: "p-003",
    slug: "cargador-inalambrico-3en1",
    name: "Estación de Carga Inalámbrica 3-en-1",
    emoji: "🔋",
    gradient: "linear-gradient(135deg,#5b3fd6,#0fae9e)",
    category: "Tech & Gadgets",
    tagline: "Carga teléfono, audífonos y reloj a la vez. Plegable.",
    description:
      "Base plegable de carga inalámbrica rápida 15W compatible con la mayoría de teléfonos, earbuds y smartwatches. Diseño de viaje. Margen altísimo, demanda constante.",
    retail: 34.99,
    wholesale: 16.75,
    moq: 12,
    unitsPerCase: 24,
    badges: ["nuevo", "top"],
    tags: ["tech", "carga", "regalo"],
    segments: ["minimarkets", "individuos"],
    landedCost: 9.4,
    sourceUrl: "https://www.alibaba.com/product-detail/3in1-wireless-charger",
    stock: 210,
  },
  {
    id: "p-004",
    slug: "audifonos-tws-pro",
    name: "Audífonos TWS Pro con Cancelación",
    emoji: "🎧",
    gradient: "linear-gradient(135deg,#1c1813,#5b3fd6)",
    category: "Tech & Gadgets",
    tagline: "Sonido brutal, estuche con pantalla de batería.",
    description:
      "Earbuds Bluetooth 5.3 con cancelación de ruido ambiental, estuche con display de batería y hasta 30h de uso. Best-seller perpetuo en mini-markets y góndolas de tecnología.",
    retail: 29.99,
    wholesale: 12.9,
    moq: 20,
    unitsPerCase: 40,
    badges: ["viral", "top"],
    tags: ["tech", "audio", "impulso"],
    segments: ["gasolineras", "minimarkets", "individuos"],
    landedCost: 7.1,
    sourceUrl: "https://www.alibaba.com/product-detail/tws-earbuds-pro",
    stock: 480,
  },
  {
    id: "p-005",
    slug: "power-bank-20000-cables",
    name: "Power Bank 20,000mAh con Cables Integrados",
    emoji: "⚡",
    gradient: "linear-gradient(135deg,#ffc53d,#ff5a36)",
    category: "Tech & Gadgets",
    tagline: "Trae sus propios cables. Carga 3 dispositivos.",
    description:
      "Batería externa de 20,000mAh con cables Lightning, USB-C y micro-USB integrados más display digital. El salvavidas que se vende solo en gasolineras y tiendas de conveniencia.",
    retail: 32.99,
    wholesale: 15.5,
    moq: 12,
    unitsPerCase: 30,
    badges: ["top"],
    tags: ["tech", "carga", "emergencia"],
    segments: ["gasolineras", "minimarkets", "individuos"],
    landedCost: 8.9,
    sourceUrl: "https://www.alibaba.com/product-detail/power-bank-20000",
    stock: 360,
  },
  {
    id: "p-006",
    slug: "masajeador-cuello-ems",
    name: "Masajeador de Cuello EMS Inteligente",
    emoji: "💆",
    gradient: "linear-gradient(135deg,#0fae9e,#5b3fd6)",
    category: "Salud & Farmacia",
    tagline: "Alivio del dolor cervical con impulsos y calor.",
    description:
      "Dispositivo EMS portátil con calor y 3 modos de masaje para aliviar la tensión del cuello. Recargable y silencioso. Producto estrella en góndolas de bienestar de farmacias.",
    retail: 27.99,
    wholesale: 11.4,
    moq: 12,
    unitsPerCase: 24,
    badges: ["viral"],
    tags: ["salud", "bienestar", "regalo"],
    segments: ["farmacias", "individuos"],
    landedCost: 6.3,
    sourceUrl: "https://www.alibaba.com/product-detail/ems-neck-massager",
    stock: 190,
  },
  {
    id: "p-007",
    slug: "termometro-infrarrojo-sin-contacto",
    name: "Termómetro Infrarrojo Sin Contacto",
    emoji: "🌡️",
    gradient: "linear-gradient(135deg,#ff5a36,#5b3fd6)",
    category: "Salud & Farmacia",
    tagline: "Lectura en 1 segundo. Frente y objetos.",
    description:
      "Termómetro infrarrojo con lectura instantánea, alarma de fiebre y memoria. Esencial de farmacia con rotación constante y buen margen.",
    retail: 19.99,
    wholesale: 7.8,
    moq: 24,
    unitsPerCase: 50,
    badges: ["top"],
    tags: ["salud", "familia", "esencial"],
    segments: ["farmacias"],
    landedCost: 4.1,
    sourceUrl: "https://www.alibaba.com/product-detail/infrared-thermometer",
    stock: 260,
  },
  {
    id: "p-008",
    slug: "gomitas-colageno-belleza",
    name: "Gomitas de Colágeno + Biotina (60ct)",
    emoji: "✨",
    gradient: "linear-gradient(135deg,#ffc53d,#0fae9e)",
    category: "Salud & Farmacia",
    tagline: "Piel, cabello y uñas. Sabor a fresa.",
    description:
      "Suplemento viral de colágeno con biotina y vitamina C en gomitas. Empaque listo para góndola. Categoría de belleza con recompra altísima en farmacias.",
    retail: 16.99,
    wholesale: 6.2,
    moq: 36,
    unitsPerCase: 72,
    badges: ["viral", "nuevo"],
    tags: ["belleza", "suplemento", "recompra"],
    segments: ["farmacias", "minimarkets", "individuos"],
    landedCost: 3.4,
    sourceUrl: "https://www.alibaba.com/product-detail/collagen-gummies",
    stock: 600,
  },
  {
    id: "p-009",
    slug: "botella-termica-led-temperatura",
    name: "Botella Térmica Inteligente con LED",
    emoji: "🫙",
    gradient: "linear-gradient(135deg,#0a7d72,#ffc53d)",
    category: "Hogar Viral",
    tagline: "La tapa muestra la temperatura. Mantiene 12h frío.",
    description:
      "Termo de acero inoxidable con tapa LED que muestra la temperatura del líquido al tocarla. Mantiene frío 12h / caliente 6h. Objeto viral de TikTok con demanda explosiva.",
    retail: 24.99,
    wholesale: 9.9,
    moq: 24,
    unitsPerCase: 48,
    badges: ["viral", "top"],
    tags: ["hogar", "viral", "regalo"],
    segments: ["minimarkets", "individuos"],
    landedCost: 5.2,
    sourceUrl: "https://www.alibaba.com/product-detail/led-temperature-bottle",
    stock: 410,
  },
  {
    id: "p-010",
    slug: "mini-ventilador-mano-recargable",
    name: "Mini Ventilador de Mano Recargable",
    emoji: "🌀",
    gradient: "linear-gradient(135deg,#0fae9e,#ffc53d)",
    category: "Hogar Viral",
    tagline: "3 velocidades, batería para todo el día. Para el calor PR.",
    description:
      "Ventilador portátil recargable, plegable y silencioso con 3 velocidades. Perfecto para el calor boricua, playa y festivales. Impulso de verano que vuela de las góndolas.",
    retail: 12.99,
    wholesale: 4.4,
    moq: 36,
    unitsPerCase: 72,
    badges: ["viral"],
    tags: ["verano", "impulso", "playa"],
    segments: ["gasolineras", "minimarkets", "individuos"],
    landedCost: 2.3,
    sourceUrl: "https://www.alibaba.com/product-detail/handheld-fan",
    stock: 720,
  },
  {
    id: "p-011",
    slug: "tira-led-rgb-app",
    name: "Tira LED RGB con App (5m)",
    emoji: "🌈",
    gradient: "linear-gradient(135deg,#5b3fd6,#ff5a36)",
    category: "Hogar Viral",
    tagline: "Control por app y música. Sincroniza con el beat.",
    description:
      "Tira LED RGB de 5m controlable por app y comando de voz, con modo música que reacciona al sonido. Imán de ventas para cuartos de gamers y decoración viral.",
    retail: 18.99,
    wholesale: 6.9,
    moq: 24,
    unitsPerCase: 50,
    badges: ["viral", "nuevo"],
    tags: ["hogar", "deco", "gamer"],
    segments: ["minimarkets", "individuos"],
    landedCost: 3.6,
    sourceUrl: "https://www.alibaba.com/product-detail/rgb-led-strip",
    stock: 380,
  },
  {
    id: "p-012",
    slug: "exprimidor-portatil-usb",
    name: "Exprimidor Portátil USB",
    emoji: "🥤",
    gradient: "linear-gradient(135deg,#ffc53d,#0fae9e)",
    category: "Hogar Viral",
    tagline: "Tu batido donde quieras. Recargable y lavable.",
    description:
      "Mini blender personal recargable de 380ml para batidos y jugos al instante. Cuchillas de acero y carga USB-C. Hit de fitness y conveniencia.",
    retail: 21.99,
    wholesale: 8.5,
    moq: 24,
    unitsPerCase: 40,
    badges: ["nuevo"],
    tags: ["hogar", "fitness", "viral"],
    segments: ["minimarkets", "individuos"],
    landedCost: 4.5,
    sourceUrl: "https://www.alibaba.com/product-detail/portable-blender",
    stock: 240,
  },
  {
    id: "p-013",
    slug: "rastreador-llaves-bluetooth",
    name: "Rastreador Bluetooth de Llaves",
    emoji: "📍",
    gradient: "linear-gradient(135deg,#1c1813,#0fae9e)",
    category: "Tech & Gadgets",
    tagline: "Nunca más pierdas las llaves o la cartera.",
    description:
      "Localizador Bluetooth compatible con apps de rastreo. Suena, ubica en el mapa y funciona como botón remoto. Compra de impulso perfecta para la caja registradora.",
    retail: 17.99,
    wholesale: 6.4,
    moq: 36,
    unitsPerCase: 60,
    badges: ["top"],
    tags: ["tech", "impulso", "regalo"],
    segments: ["gasolineras", "minimarkets", "individuos"],
    landedCost: 3.1,
    sourceUrl: "https://www.alibaba.com/product-detail/bluetooth-tracker",
    stock: 330,
  },
  {
    id: "p-014",
    slug: "limpiador-facial-sonico",
    name: "Cepillo Limpiador Facial Sónico",
    emoji: "🧖",
    gradient: "linear-gradient(135deg,#ff5a36,#ffc53d)",
    category: "Salud & Farmacia",
    tagline: "Limpieza profunda de silicona. Impermeable.",
    description:
      "Cepillo facial sónico de silicona suave, recargable e impermeable, con modos de limpieza y masaje. Categoría de belleza premium con buen ticket en farmacias.",
    retail: 22.99,
    wholesale: 8.9,
    moq: 24,
    unitsPerCase: 40,
    badges: ["nuevo"],
    tags: ["belleza", "skincare", "regalo"],
    segments: ["farmacias", "individuos"],
    landedCost: 4.7,
    sourceUrl: "https://www.alibaba.com/product-detail/sonic-facial-brush",
    stock: 175,
  },
  {
    id: "p-015",
    slug: "organizador-maletero-plegable",
    name: "Organizador de Maletero Plegable",
    emoji: "🧳",
    gradient: "linear-gradient(135deg,#0a7d72,#1c1813)",
    category: "Auto & Gasolinera",
    tagline: "Mantén el baúl en orden. Se pliega y guarda.",
    description:
      "Organizador de baúl resistente, plegable, con compartimentos y asas reforzadas. Práctico y de margen sólido para góndolas de accesorios de auto.",
    retail: 26.99,
    wholesale: 10.9,
    moq: 12,
    unitsPerCase: 24,
    badges: ["top"],
    tags: ["carro", "organizacion", "hogar"],
    segments: ["gasolineras", "individuos"],
    landedCost: 5.6,
    sourceUrl: "https://www.alibaba.com/product-detail/trunk-organizer",
    stock: 150,
  },
];

const COLLECTION_BY_CATEGORY: Record<string, string> = {
  "Auto & Gasolinera": "Imprescindibles de Carro",
  "Tech & Gadgets": "Tech Viral",
  "Salud & Farmacia": "Bienestar",
  "Hogar Viral": "Hogar & Lifestyle",
};

// Descuentos de demostración (editables/quitables desde el admin).
const DEMO_DISCOUNTS: Record<string, number> = {
  "p-004": 10,
  "p-009": 15,
  "p-010": 20,
};

/** Catálogo semilla normalizado con los campos de gestión de tienda. */
export const SEED_PRODUCTS: Product[] = RAW.map((p) => ({
  ...p,
  collection: COLLECTION_BY_CATEGORY[p.category] ?? "General",
  discountPercent: DEMO_DISCOUNTS[p.id] ?? 0,
  shippingPrice: p.retail >= 30 ? 6.99 : 3.99,
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

// --- Opciones para los formularios del admin ---
export const DEFAULT_CATEGORIES = [
  "Auto & Gasolinera",
  "Tech & Gadgets",
  "Salud & Farmacia",
  "Hogar Viral",
];

export const DEFAULT_COLLECTIONS = [
  "Tech Viral",
  "Imprescindibles de Carro",
  "Bienestar",
  "Hogar & Lifestyle",
  "Más Vendidos",
  "Ofertas",
  "General",
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
