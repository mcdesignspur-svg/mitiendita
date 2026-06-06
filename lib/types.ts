export type Badge = "viral" | "nuevo" | "top";

export type Segment = "gasolineras" | "farmacias" | "minimarkets" | "individuos";

export interface Product {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  /** CSS gradient used as the product "photo" placeholder (fallback). */
  gradient: string;
  /** URL de la imagen real del producto (Vercel Blob). Si falta, se usa gradient+emoji. */
  imageUrl?: string;
  category: string;
  tagline: string;
  description: string;
  /** Precio al detal (B2C), USD. */
  retail: number;
  /** Precio mayorista por unidad (B2B verificado), USD. */
  wholesale: number;
  /** Orden mínima de compra mayorista (unidades). */
  moq: number;
  /** Unidades por caja máster (para reposición de negocios). */
  unitsPerCase: number;
  badges: Badge[];
  tags: string[];
  /** Segmentos a los que mejor le vende este producto. */
  segments: Segment[];
  /** Costo estimado de importación por unidad (interno / admin). */
  landedCost: number;
  /** Enlace de referencia del proveedor (Alibaba). */
  sourceUrl: string;
  stock: number;

  // --- Gestión de tienda (editable desde el admin) ---
  /** Colección a la que pertenece (ej. "Tech Viral", "Verano"). */
  collection?: string;
  /** Descuento al detal (B2C), 0–100 %. 0 = sin descuento. */
  discountPercent?: number;
  /** Costo de envío del producto (flat), USD. */
  shippingPrice?: number;
  /** Si está visible en la tienda pública. */
  active?: boolean;
}

export type BusinessType =
  | "gasolinera"
  | "farmacia"
  | "minimarket"
  | "colmado"
  | "otro";

export type BusinessStatus = "pending" | "verified" | "rejected";

export interface Business {
  id: string;
  businessName: string;
  type: BusinessType;
  contactName: string;
  email: string;
  phone: string;
  municipio: string;
  /** Número de Registro de Comerciante (Hacienda PR). */
  registroComerciante: string;
  status: BusinessStatus;
  passwordHash: string;
  createdAt: string;
  notes?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  kind: "b2c" | "b2b";
  businessId?: string;
  customerName: string;
  email: string;
  items: OrderItem[];
  /** Costo de envío del pedido. */
  shipping?: number;
  /** Total = subtotal de items + envío. */
  total: number;
  status: "nuevo" | "procesando" | "enviado";
  createdAt: string;
}

// ===========================================================================
// Columna operativa AI-first: la investigación de Claude (agente operador) y
// la del panel aterrizan aquí. La página lee de estas mismas tablas.
// ===========================================================================

export type SourcingStage =
  | "Detectado"
  | "Evaluando"
  | "Negociando"
  | "Ordenado"
  | "Descartado";

/** Candidato del pipeline de sourcing (idea → evaluación → producto). */
export interface SourcingCandidate {
  id: string;
  name: string;
  emoji: string;
  category: string;
  /** Nombre del suplidor (denormalizado) + enlace opcional a Supplier. */
  supplier: string;
  supplierId?: string;
  /** Costo importado estimado por unidad (USD). */
  unitCost: number;
  /** Retail estimado (USD). */
  estRetail: number;
  /** Mayorista estimado por unidad (USD). */
  estWholesale?: number;
  moq?: number;
  /** 0..1 señal de tendencia/demanda. */
  trend: number;
  /** 0..1 fricción logística (más alto = más caro/lento de traer). */
  shipping: number;
  stage: SourcingStage;
  /** Por qué es candidato (la señal que lo detectó). */
  signal: string;
  sourceUrl?: string;
  notes?: string;
  /** Origen: "agente" = lo trajo Claude investigando; "app"/"manual" = panel. */
  origin: "agente" | "app" | "manual";
  /** Id del producto si ya se promovió al catálogo. */
  productId?: string;
  createdAt: string;
}

export type SupplierStatus =
  | "nuevo"
  | "contactado"
  | "cotizando"
  | "muestra"
  | "aprobado"
  | "descartado";

/** Suplidor que Claude (o el operador) investiga y contacta. */
export interface Supplier {
  id: string;
  name: string;
  /** Plataforma: Alibaba, AliExpress, 1688, Otro. */
  platform: string;
  url?: string;
  contactName?: string;
  email?: string;
  whatsapp?: string;
  country?: string;
  /** Qué productos vende (texto libre). */
  products?: string;
  status: SupplierStatus;
  /** Último borrador de outreach redactado por AI. */
  outreachDraft?: string;
  notes?: string;
  createdAt: string;
  lastContactedAt?: string;
}
