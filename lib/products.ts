import type { Product, Badge, Segment, Grupo } from "./types";

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
    slug: "cargador-carro-usbc-45w",
    name: "Cargador de Carro Rápido USB-C 45W",
    emoji: "🔌",
    gradient: "linear-gradient(135deg,#0fae9e,#5b3fd6)",
    category: "Impulso & Conveniencia",
    tagline: "Carga rápida en el carro. 2 puertos, 45W.",
    description:
      "Cargador de auto con carga rápida USB-C 45W + USB-A para cargar dos dispositivos a la vez. Compacto y con luz indicadora. La compra de impulso clásica en la góndola de la caja: todo el mundo necesita uno.",
    retail: 16.99,
    wholesale: 6.9,
    moq: 24,
    unitsPerCase: 48,
    badges: ["top"],
    tags: ["carro", "carga", "impulso", "esencial"],
    segments: ["gasolineras", "farmacias", "minimarkets", "individuos"],
    landedCost: 3.2,
    sourceUrl: "https://www.alibaba.com/product-detail/usb-c-car-charger-45w",
    stock: 420,
  },
  {
    id: "p-007",
    slug: "linterna-led-recargable-usbc",
    name: "Linterna LED Recargable USB-C",
    emoji: "🔦",
    gradient: "linear-gradient(135deg,#1c1813,#5b3fd6)",
    category: "Impulso & Conveniencia",
    tagline: "Luz potente para apagones. Recargable USB-C.",
    description:
      "Linterna LED recargable de alto lumen con varios modos y batería de larga duración. Imprescindible en Puerto Rico para apagones y emergencias: alta rotación todo el año y pico en temporada de huracanes.",
    retail: 19.99,
    wholesale: 8.5,
    moq: 24,
    unitsPerCase: 40,
    badges: ["top", "nuevo"],
    tags: ["emergencia", "apagon", "huracan", "esencial"],
    segments: ["gasolineras", "farmacias", "minimarkets", "individuos"],
    landedCost: 4.2,
    sourceUrl: "https://www.alibaba.com/product-detail/usb-c-rechargeable-flashlight",
    stock: 300,
  },
  {
    id: "p-008",
    slug: "cable-cargador-6en1-retractil",
    name: "Cable Cargador 6-en-1 Retráctil",
    emoji: "🪢",
    gradient: "linear-gradient(135deg,#ffc53d,#0fae9e)",
    category: "Impulso & Conveniencia",
    tagline: "Un cable para todo. Retráctil, carga rápida.",
    description:
      "Cable retráctil 6-en-1 con conectores USB-C, Lightning y USB-A para cargar y transferir en cualquier dispositivo. Se enreda menos y cabe en el bolsillo. Los cables se pierden y se dañan: recompra constante y margen alto.",
    retail: 11.99,
    wholesale: 4.5,
    moq: 36,
    unitsPerCase: 72,
    badges: ["viral", "nuevo"],
    tags: ["carga", "cable", "impulso", "recompra"],
    segments: ["gasolineras", "farmacias", "minimarkets", "individuos"],
    landedCost: 1.8,
    sourceUrl: "https://www.alibaba.com/product-detail/6-in-1-retractable-cable",
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
    slug: "lampara-mata-mosquitos-led",
    name: "Lámpara Mata-Mosquitos LED Recargable",
    emoji: "🦟",
    gradient: "linear-gradient(135deg,#ff5a36,#ffc53d)",
    category: "Impulso & Conveniencia",
    tagline: "Adiós mosquitos. Silenciosa y recargable.",
    description:
      "Lámpara mata-mosquitos LED recargable por USB, sin químicos ni olor, para la casa, el balcón y el patio. Perfecta para el clima boricua: demanda fuerte en temporada de lluvia y dengue.",
    retail: 22.99,
    wholesale: 9.9,
    moq: 24,
    unitsPerCase: 40,
    badges: ["nuevo"],
    tags: ["hogar", "verano", "utilidad", "patio"],
    segments: ["gasolineras", "farmacias", "minimarkets", "individuos"],
    landedCost: 5.5,
    sourceUrl: "https://www.alibaba.com/product-detail/usb-mosquito-killer-lamp",
    stock: 220,
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
  "p-001": ["g-carro", "g-mas-vendidos"],
  "p-002": ["g-carro"],
  "p-004": ["g-mas-vendidos"],
  "p-005": ["g-emergencia", "g-mas-vendidos"],
  "p-007": ["g-emergencia"],
  "p-010": ["g-verano"],
  "p-014": ["g-verano"],
  "p-015": ["g-carro"],
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
  grupoIds: GRUPOS_BY_PRODUCT[p.id] ?? [],
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
  "Impulso & Conveniencia",
  "Hogar Viral",
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
