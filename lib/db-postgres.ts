import crypto from "node:crypto";
import { eq, ne, desc } from "drizzle-orm";
import { getDb } from "./drizzle";
import { products, businesses, orders } from "./schema";
import { slugify } from "./products";
import type {
  Business,
  BusinessStatus,
  BusinessType,
  Order,
  Product,
} from "./types";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(5).toString("hex")}`;
}

function uniqueSlug(existing: string[], base: string): string {
  const safe = base || "producto";
  const taken = new Set(existing);
  if (!taken.has(safe)) return safe;
  let i = 2;
  while (taken.has(`${safe}-${i}`)) i++;
  return `${safe}-${i}`;
}

// --- Row mappers (omiten columnas internas como seq) ------------
type ProductRow = typeof products.$inferSelect;
type BusinessRow = typeof businesses.$inferSelect;
type OrderRow = typeof orders.$inferSelect;

function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    emoji: r.emoji,
    gradient: r.gradient,
    category: r.category,
    collection: r.collection ?? undefined,
    tagline: r.tagline,
    description: r.description,
    retail: r.retail,
    wholesale: r.wholesale,
    moq: r.moq,
    unitsPerCase: r.unitsPerCase,
    badges: r.badges,
    tags: r.tags,
    segments: r.segments,
    landedCost: r.landedCost,
    sourceUrl: r.sourceUrl,
    stock: r.stock,
    discountPercent: r.discountPercent,
    shippingPrice: r.shippingPrice,
    active: r.active,
  };
}

function toBusiness(r: BusinessRow): Business {
  return {
    id: r.id,
    businessName: r.businessName,
    type: r.type as BusinessType,
    contactName: r.contactName,
    email: r.email,
    phone: r.phone,
    municipio: r.municipio,
    registroComerciante: r.registroComerciante,
    status: r.status as BusinessStatus,
    passwordHash: r.passwordHash,
    createdAt: r.createdAt,
    notes: r.notes ?? undefined,
  };
}

function toOrder(r: OrderRow): Order {
  return {
    id: r.id,
    kind: r.kind as Order["kind"],
    businessId: r.businessId ?? undefined,
    customerName: r.customerName,
    email: r.email,
    items: r.items,
    shipping: r.shipping,
    total: r.total,
    status: r.status as Order["status"],
    createdAt: r.createdAt,
  };
}

// --- Businesses -------------------------------------------------
export async function listBusinesses(): Promise<Business[]> {
  const rows = await getDb().select().from(businesses).orderBy(desc(businesses.createdAt));
  return rows.map(toBusiness);
}

export async function getBusinessById(bid: string): Promise<Business | undefined> {
  const rows = await getDb().select().from(businesses).where(eq(businesses.id, bid)).limit(1);
  return rows[0] ? toBusiness(rows[0]) : undefined;
}

export async function getBusinessByEmail(email: string): Promise<Business | undefined> {
  const rows = await getDb()
    .select()
    .from(businesses)
    .where(eq(businesses.email, email.toLowerCase()))
    .limit(1);
  return rows[0] ? toBusiness(rows[0]) : undefined;
}

export async function createBusiness(
  input: Omit<Business, "id" | "status" | "createdAt">,
): Promise<Business> {
  const business: Business = {
    ...input,
    id: newId("b"),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await getDb().insert(businesses).values(business);
  return business;
}

export async function setBusinessStatus(
  bid: string,
  status: BusinessStatus,
): Promise<Business | undefined> {
  const rows = await getDb()
    .update(businesses)
    .set({ status })
    .where(eq(businesses.id, bid))
    .returning();
  return rows[0] ? toBusiness(rows[0]) : undefined;
}

// --- Orders -----------------------------------------------------
export async function listOrders(): Promise<Order[]> {
  const rows = await getDb().select().from(orders).orderBy(desc(orders.createdAt));
  return rows.map(toOrder);
}

export async function getOrderById(oid: string): Promise<Order | undefined> {
  const rows = await getDb().select().from(orders).where(eq(orders.id, oid)).limit(1);
  return rows[0] ? toOrder(rows[0]) : undefined;
}

export async function createOrder(
  input: Omit<Order, "id" | "createdAt" | "status">,
): Promise<Order> {
  const order: Order = {
    ...input,
    id: newId("o"),
    status: "nuevo",
    createdAt: new Date().toISOString(),
  };
  await getDb().insert(orders).values(order);
  return order;
}

// --- Products ---------------------------------------------------
export async function listProducts(
  opts: { activeOnly?: boolean } = {},
): Promise<Product[]> {
  const db = getDb();
  const rows = opts.activeOnly
    ? await db.select().from(products).where(eq(products.active, true)).orderBy(products.seq)
    : await db.select().from(products).orderBy(products.seq);
  return rows.map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const rows = await getDb().select().from(products).where(eq(products.slug, slug)).limit(1);
  return rows[0] ? toProduct(rows[0]) : undefined;
}

export async function getProductById(pid: string): Promise<Product | undefined> {
  const rows = await getDb().select().from(products).where(eq(products.id, pid)).limit(1);
  return rows[0] ? toProduct(rows[0]) : undefined;
}

export async function createProduct(
  input: Omit<Product, "id" | "slug"> & { slug?: string },
): Promise<Product> {
  const db = getDb();
  const existing = await db.select({ slug: products.slug }).from(products);
  const base = input.slug?.trim() ? slugify(input.slug) : slugify(input.name);
  const slug = uniqueSlug(existing.map((r) => r.slug), base);
  const values = { ...input, id: newId("p"), slug };
  const rows = await db.insert(products).values(values).returning();
  return toProduct(rows[0]);
}

export async function updateProduct(
  pid: string,
  patch: Partial<Product>,
): Promise<Product | undefined> {
  const db = getDb();
  const set: Partial<typeof products.$inferInsert> = { ...patch };
  if (patch.slug) {
    const others = await db.select({ slug: products.slug }).from(products).where(ne(products.id, pid));
    set.slug = uniqueSlug(others.map((r) => r.slug), slugify(patch.slug));
  }
  const rows = await db.update(products).set(set).where(eq(products.id, pid)).returning();
  return rows[0] ? toProduct(rows[0]) : undefined;
}

export async function deleteProduct(pid: string): Promise<boolean> {
  const rows = await getDb().delete(products).where(eq(products.id, pid)).returning({ id: products.id });
  return rows.length > 0;
}

export async function relatedProducts(slug: string, n = 3): Promise<Product[]> {
  const all = (await listProducts({ activeOnly: true }));
  const base = all.find((p) => p.slug === slug);
  const others = all.filter((p) => p.slug !== slug);
  if (!base) return others.slice(0, n);
  const sameCat = others.filter((p) => p.category === base.category);
  const restCat = others.filter((p) => p.category !== base.category);
  return [...sameCat, ...restCat].slice(0, n);
}

export async function listCategories(): Promise<string[]> {
  const rows = await getDb().selectDistinct({ category: products.category }).from(products);
  return rows.map((r) => r.category).sort();
}

export async function listCollections(): Promise<string[]> {
  const rows = await getDb().selectDistinct({ collection: products.collection }).from(products);
  return rows
    .map((r) => r.collection)
    .filter((c): c is string => Boolean(c))
    .sort();
}
