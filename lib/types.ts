export type Badge = "viral" | "nuevo" | "top";

export type Segment = "gasolineras" | "farmacias" | "minimarkets" | "individuos";

export interface Product {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  /** CSS gradient used as the product "photo" placeholder (fallback). */
  gradient: string;
  /** URL de la imagen principal/portada (Vercel Blob). Si falta, se usa gradient+emoji. */
  imageUrl?: string;
  /** Galería de fotos del producto (carrusel). La primera es la portada (== imageUrl). */
  imageUrls?: string[];
  /** URL de un video del producto (Vercel Blob). Si existe, es el visual destacado. */
  videoUrl?: string;
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
  /** Ids de los grupos a los que pertenece (curaduría interna del catálogo). */
  grupoIds?: string[];
  /** Descuento al detal (B2C), 0–100 %. 0 = sin descuento. */
  discountPercent?: number;
  /** Costo de envío del producto (flat), USD. */
  shippingPrice?: number;
  /** Si está visible en la tienda pública. */
  active?: boolean;
}

/**
 * Grupo curado de productos (gestión interna del catálogo). Un producto puede
 * pertenecer a varios grupos a la vez. Solo se usa en el panel /admin.
 */
export interface Grupo {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  /** Descripción corta del grupo (opcional). */
  description?: string;
  /** Color de acento del chip (CSS var o hex). */
  color?: string;
  createdAt: string;
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
  /** Estado de pago. Cash-first: B2C y B2B pagan ahora (tarjeta/ATH). `factura_pendiente` queda reservado para crédito ganado (ESTRATEGIA-B2B.md, Fase 4). */
  paymentStatus?: "pendiente_pago" | "pagada" | "factura_pendiente" | "fallida";
  /** Método: tarjeta (Stripe), ATH Móvil, o factura (solo crédito ganado, Fase 4). */
  paymentMethod?: "stripe" | "ath_movil" | "factura";
  /** Id de la sesión de Stripe Checkout (para reconciliar el pago). */
  stripeSessionId?: string;
  /** Id de la transacción ATH Móvil (ecommerceId) para verificar server-to-server. */
  athEcommerceId?: string;
  /** Referencia del pago (Stripe session / referencia ATH Móvil). */
  paymentRef?: string;
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
  /** Foto del producto que trae Hermes scrapeando Alibaba (opcional). */
  imageUrl?: string;
  notes?: string;
  /** Origen: "agente" = lo trajo Claude investigando; "app"/"manual" = panel. */
  origin: "agente" | "app" | "manual";
  /** Id del producto si ya se promovió al catálogo. */
  productId?: string;
  createdAt: string;
}

// ===========================================================================
// Cerebro de control: la cola de aprobaciones (gates) y la bitácora de agentes.
// Hermes (el agente de computer use que maneja Alibaba) es stateless; estas
// tablas + el resto del brain son su memoria. Ver OPERATIONS.md.
// ===========================================================================

/**
 * Nombre del agente/actor que escribe en el sistema.
 * `hermes` = el agente de computer use que maneja Alibaba (reemplazó al viejo
 * `chrome`, la extensión de Chrome; se conserva en la unión por logs históricos).
 */
export type AgentName = "hermes" | "chrome" | "operador" | "cron" | "app";

/** Tipo de decisión que espera a Miguel (un gate de la línea de ensamblaje). */
export type ApprovalKind =
  | "candidato"
  | "outreach"
  | "orden_compra"
  | "activar_producto"
  | "promocion"
  | "recibo"
  | "recompra";

export type ApprovalStatus = "pendiente" | "aprobada" | "rechazada";

/**
 * Tarea que espera la decisión de Miguel antes de cruzar un gate de dinero,
 * contacto externo o publicación. Al aprobarse, `dispatchApproval` ejecuta su
 * efecto según el `kind` (ver lib/control.ts).
 */
export interface ApprovalTask {
  id: string;
  kind: ApprovalKind;
  title: string;
  /** Resumen + recomendación del agente (el porqué). */
  summary: string;
  status: ApprovalStatus;
  /** Quién la creó. */
  createdBy: AgentName;
  /** Datos para ejecutar el efecto al aprobar (ids, borradores, etc.). */
  payload?: Record<string, unknown>;
  /** Entidad relacionada (para enlazar desde el admin). */
  relatedType?: "candidate" | "supplier" | "product" | "order" | "purchase_order" | "campaign";
  relatedId?: string;
  /** Cuándo se decidió (aprobó/rechazó). */
  decidedAt?: string;
  decisionNote?: string;
  /** Cuándo un agente ya ejecutó la tarea aprobada (sale de la cola del brief). */
  executedAt?: string;
  createdAt: string;
}

export type AgentRunStatus = "ok" | "error" | "parcial";

/** Bitácora: rastro de lo que hizo un agente/cron en una corrida. Nada a ciegas. */
export interface AgentRun {
  id: string;
  agent: AgentName;
  /** Acción corta: "ingest", "outreach", "brief", "aprobar:candidato"… */
  action: string;
  status: AgentRunStatus;
  summary: string;
  /** Detalle libre (counts, ids tocados, error). */
  meta?: Record<string, unknown>;
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

// ===========================================================================
// Fase 2 — Loop de compra: cotización (Quote) y orden de compra (PurchaseOrder).
// ===========================================================================

/** Cotización estructurada de un suplidor para un producto/candidato. */
export interface Quote {
  id: string;
  supplierId?: string;
  supplierName: string;
  candidateId?: string;
  productName: string;
  /** Precio cotizado por unidad (USD). */
  unitCost: number;
  moq?: number;
  leadTimeDays?: number;
  sampleCost?: number;
  /** Costo estimado de envío a PR (USD). */
  shippingToPR?: number;
  currency?: string;
  validUntil?: string;
  notes?: string;
  origin: AgentName;
  createdAt: string;
}

export type PurchaseOrderStatus =
  | "borrador"
  | "enviada"
  | "confirmada"
  | "pagada"
  | "produccion"
  | "embarcada"
  | "recibida"
  | "cancelada";

export type PurchaseOrderPayment = "trade_assurance" | "transferencia" | "tarjeta" | "otro";

/** Orden de compra a un suplidor (el compromiso de dinero). Una línea por orden. */
export interface PurchaseOrder {
  id: string;
  supplierId?: string;
  supplierName: string;
  candidateId?: string;
  productId?: string;
  quoteId?: string;
  productName: string;
  qty: number;
  /** Costo por unidad (USD). */
  unitCost: number;
  /** Costo de envío del lote (USD). */
  shippingCost?: number;
  /** Total = qty*unitCost + shipping. */
  total: number;
  currency?: string;
  status: PurchaseOrderStatus;
  paymentMethod?: PurchaseOrderPayment;
  /** ETA de llegada. */
  expectedAt?: string;
  notes?: string;
  createdBy: AgentName;
  createdAt: string;
}

// ===========================================================================
// Fase 3 — Loop físico: embarque (Shipment) y movimientos de inventario.
// ===========================================================================

export type ShipmentStatus = "preparando" | "en_transito" | "aduana" | "entregado";

/** Embarque de una orden de compra (tracking de la mercancía hacia PR). */
export interface Shipment {
  id: string;
  purchaseOrderId: string;
  productName: string;
  carrier?: string;
  tracking?: string;
  status: ShipmentStatus;
  etaAt?: string;
  notes?: string;
  createdBy: AgentName;
  createdAt: string;
  updatedAt?: string;
}

export type InventoryReason = "recibo" | "venta" | "ajuste" | "merma";

/** Movimiento de inventario. `Product.stock` es el saldo acumulado de estos. */
export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  /** Positivo = entrada, negativo = salida. */
  delta: number;
  reason: InventoryReason;
  /** Referencia (orderId, purchaseOrderId, etc.). */
  ref?: string;
  note?: string;
  createdBy: AgentName;
  createdAt: string;
}

// ===========================================================================
// Fase 5 — Promociones: campañas programadas con descuento y copy.
// ===========================================================================

export type CampaignStatus = "borrador" | "activa" | "finalizada";

/** Campaña/promoción: aplica un descuento a un set de productos por una ventana. */
export interface Campaign {
  id: string;
  name: string;
  /** Productos en promoción. */
  productIds: string[];
  /** Segmento objetivo (o "todos"). */
  segment?: Segment | "todos";
  /** Descuento al detal, 0–90 %. */
  discountPercent: number;
  startsAt?: string;
  endsAt?: string;
  status: CampaignStatus;
  /** Copy de marketing generado (headline + caption). */
  copy?: string;
  createdBy: AgentName;
  createdAt: string;
}
