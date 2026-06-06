export type Badge = "viral" | "nuevo" | "top";

export type Segment = "gasolineras" | "farmacias" | "minimarkets" | "individuos";

export interface Product {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  /** CSS gradient used as the product "photo" placeholder. */
  gradient: string;
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
