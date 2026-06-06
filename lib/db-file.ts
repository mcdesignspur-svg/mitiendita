import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Business, Order, Product } from "./types";
import { hashPassword } from "./crypto";
import { SEED_PRODUCTS, slugify } from "./products";

/**
 * Fallback de desarrollo: un archivo JSON en /.data.
 * Se usa automáticamente cuando NO hay DATABASE_URL. En producción/Neon se
 * usa db-postgres.ts. Ambos comparten el mismo contrato async (ver db.ts).
 */

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

interface DB {
  businesses: Business[];
  orders: Order[];
  products: Product[];
}

function seed(): DB {
  return {
    businesses: [
      {
        id: "b-demo",
        businessName: "Gasolinera Caribe Express",
        type: "gasolinera",
        contactName: "Luis Rivera",
        email: "demo@gasolinera.pr",
        phone: "787-555-0101",
        municipio: "Bayamón",
        registroComerciante: "PR-2024-148902",
        status: "verified",
        passwordHash: hashPassword("demo1234"),
        createdAt: "2026-05-20T14:00:00.000Z",
        notes: "Cuenta demo verificada.",
      },
      {
        id: "b-pending",
        businessName: "Farmacia La Salud",
        type: "farmacia",
        contactName: "Marta Colón",
        email: "farmacia@salud.pr",
        phone: "787-555-0148",
        municipio: "Caguas",
        registroComerciante: "PR-2026-009431",
        status: "pending",
        passwordHash: hashPassword("salud1234"),
        createdAt: "2026-06-04T09:30:00.000Z",
      },
    ],
    orders: [],
    products: SEED_PRODUCTS,
  };
}

function read(): DB {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DB_FILE)) {
      const initial = seed();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Partial<DB>;
    return migrate(parsed);
  } catch {
    return seed();
  }
}

/** Rellena claves faltantes en archivos viejos (ej. el store sin productos). */
function migrate(db: Partial<DB>): DB {
  const full: DB = {
    businesses: db.businesses ?? [],
    orders: db.orders ?? [],
    products: db.products ?? [],
  };
  if (!db.products || db.products.length === 0) {
    full.products = SEED_PRODUCTS;
    write(full);
  }
  return full;
}

function write(db: DB): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function id(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(5).toString("hex")}`;
}

function uniqueSlug(products: Product[], base: string): string {
  const safe = base || "producto";
  const taken = new Set(products.map((p) => p.slug));
  if (!taken.has(safe)) return safe;
  let i = 2;
  while (taken.has(`${safe}-${i}`)) i++;
  return `${safe}-${i}`;
}

// --- Businesses -------------------------------------------------
export async function listBusinesses(): Promise<Business[]> {
  return read().businesses.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBusinessById(bid: string): Promise<Business | undefined> {
  return read().businesses.find((b) => b.id === bid);
}

export async function getBusinessByEmail(email: string): Promise<Business | undefined> {
  return read().businesses.find((b) => b.email.toLowerCase() === email.toLowerCase());
}

export async function createBusiness(
  input: Omit<Business, "id" | "status" | "createdAt">,
): Promise<Business> {
  const db = read();
  const business: Business = {
    ...input,
    id: id("b"),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  db.businesses.push(business);
  write(db);
  return business;
}

export async function setBusinessStatus(
  bid: string,
  status: Business["status"],
): Promise<Business | undefined> {
  const db = read();
  const b = db.businesses.find((x) => x.id === bid);
  if (!b) return undefined;
  b.status = status;
  write(db);
  return b;
}

// --- Orders -----------------------------------------------------
export async function listOrders(): Promise<Order[]> {
  return read().orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrderById(oid: string): Promise<Order | undefined> {
  return read().orders.find((o) => o.id === oid);
}

export async function createOrder(
  input: Omit<Order, "id" | "createdAt" | "status">,
): Promise<Order> {
  const db = read();
  const order: Order = {
    ...input,
    id: id("o"),
    status: "nuevo",
    createdAt: new Date().toISOString(),
  };
  db.orders.push(order);
  write(db);
  return order;
}

// --- Products ---------------------------------------------------
export async function listProducts(opts: { activeOnly?: boolean } = {}): Promise<Product[]> {
  const all = read().products;
  return opts.activeOnly ? all.filter((p) => p.active !== false) : all;
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  return read().products.find((p) => p.slug === slug);
}

export async function getProductById(pid: string): Promise<Product | undefined> {
  return read().products.find((p) => p.id === pid);
}

export async function createProduct(
  input: Omit<Product, "id" | "slug"> & { slug?: string },
): Promise<Product> {
  const db = read();
  const base = input.slug?.trim() ? slugify(input.slug) : slugify(input.name);
  const slug = uniqueSlug(db.products, base);
  const product: Product = { ...input, id: id("p"), slug };
  db.products.push(product);
  write(db);
  return product;
}

export async function updateProduct(
  pid: string,
  patch: Partial<Product>,
): Promise<Product | undefined> {
  const db = read();
  const p = db.products.find((x) => x.id === pid);
  if (!p) return undefined;
  const { slug, ...rest } = patch;
  Object.assign(p, rest);
  if (slug) {
    p.slug = uniqueSlug(db.products.filter((x) => x.id !== pid), slugify(slug));
  }
  write(db);
  return p;
}

export async function deleteProduct(pid: string): Promise<boolean> {
  const db = read();
  const before = db.products.length;
  db.products = db.products.filter((p) => p.id !== pid);
  const removed = db.products.length < before;
  if (removed) write(db);
  return removed;
}

export async function relatedProducts(slug: string, n = 3): Promise<Product[]> {
  const all = read().products.filter((p) => p.active !== false);
  const base = all.find((p) => p.slug === slug);
  const others = all.filter((p) => p.slug !== slug);
  if (!base) return others.slice(0, n);
  const sameCat = others.filter((p) => p.category === base.category);
  const restCat = others.filter((p) => p.category !== base.category);
  return [...sameCat, ...restCat].slice(0, n);
}

export async function listCategories(): Promise<string[]> {
  return Array.from(new Set(read().products.map((p) => p.category))).sort();
}

export async function listCollections(): Promise<string[]> {
  return Array.from(
    new Set(read().products.map((p) => p.collection).filter(Boolean) as string[]),
  ).sort();
}
