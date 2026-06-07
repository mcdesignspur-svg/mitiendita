import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type {
  AgentRun,
  ApprovalStatus,
  ApprovalTask,
  Business,
  Campaign,
  CampaignStatus,
  Grupo,
  InventoryMovement,
  Order,
  Product,
  PurchaseOrder,
  PurchaseOrderStatus,
  Quote,
  Shipment,
  ShipmentStatus,
  SourcingCandidate,
  Supplier,
  SupplierStatus,
} from "./types";
import { hashPassword } from "./crypto";
import { SEED_PRODUCTS, SEED_GRUPOS, slugify } from "./products";
import { SEED_CANDIDATES, SEED_SUPPLIERS } from "./sourcing";

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
  grupos: Grupo[];
  sourcingCandidates: SourcingCandidate[];
  suppliers: Supplier[];
  approvalTasks: ApprovalTask[];
  agentRuns: AgentRun[];
  quotes: Quote[];
  purchaseOrders: PurchaseOrder[];
  shipments: Shipment[];
  inventoryMovements: InventoryMovement[];
  campaigns: Campaign[];
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
    grupos: SEED_GRUPOS,
    sourcingCandidates: SEED_CANDIDATES,
    suppliers: SEED_SUPPLIERS,
    approvalTasks: [],
    agentRuns: [],
    quotes: [],
    purchaseOrders: [],
    shipments: [],
    inventoryMovements: [],
    campaigns: [],
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
    grupos: db.grupos ?? [],
    sourcingCandidates: db.sourcingCandidates ?? [],
    suppliers: db.suppliers ?? [],
    approvalTasks: db.approvalTasks ?? [],
    agentRuns: db.agentRuns ?? [],
    quotes: db.quotes ?? [],
    purchaseOrders: db.purchaseOrders ?? [],
    shipments: db.shipments ?? [],
    inventoryMovements: db.inventoryMovements ?? [],
    campaigns: db.campaigns ?? [],
  };
  let dirty = false;
  if (!db.products || db.products.length === 0) {
    full.products = SEED_PRODUCTS;
    dirty = true;
  }
  // Siembra los grupos en stores viejos que no los tenían.
  if (db.grupos === undefined) {
    full.grupos = SEED_GRUPOS;
    dirty = true;
  }
  // Siembra la columna operativa en stores viejos que no la tenían.
  if (db.sourcingCandidates === undefined) {
    full.sourcingCandidates = SEED_CANDIDATES;
    dirty = true;
  }
  if (db.suppliers === undefined) {
    full.suppliers = SEED_SUPPLIERS;
    dirty = true;
  }
  // Cerebro de control: arrancan vacíos en stores viejos.
  if (db.approvalTasks === undefined) {
    full.approvalTasks = [];
    dirty = true;
  }
  if (db.agentRuns === undefined) {
    full.agentRuns = [];
    dirty = true;
  }
  if (db.quotes === undefined) {
    full.quotes = [];
    dirty = true;
  }
  if (db.purchaseOrders === undefined) {
    full.purchaseOrders = [];
    dirty = true;
  }
  if (db.shipments === undefined) {
    full.shipments = [];
    dirty = true;
  }
  if (db.inventoryMovements === undefined) {
    full.inventoryMovements = [];
    dirty = true;
  }
  if (db.campaigns === undefined) {
    full.campaigns = [];
    dirty = true;
  }
  if (dirty) write(full);
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

export async function updateOrder(
  oid: string,
  patch: Partial<Order>,
): Promise<Order | undefined> {
  const db = read();
  const o = db.orders.find((x) => x.id === oid);
  if (!o) return undefined;
  Object.assign(o, patch);
  write(db);
  return o;
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

// --- Grupos -----------------------------------------------------
function uniqueGrupoSlug(grupos: Grupo[], base: string): string {
  const safe = base || "grupo";
  const taken = new Set(grupos.map((g) => g.slug));
  if (!taken.has(safe)) return safe;
  let i = 2;
  while (taken.has(`${safe}-${i}`)) i++;
  return `${safe}-${i}`;
}

export async function listGrupos(): Promise<Grupo[]> {
  return read().grupos.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getGrupoById(gid: string): Promise<Grupo | undefined> {
  return read().grupos.find((g) => g.id === gid);
}

export async function createGrupo(
  input: Omit<Grupo, "id" | "slug" | "createdAt"> & { slug?: string },
): Promise<Grupo> {
  const db = read();
  const base = input.slug?.trim() ? slugify(input.slug) : slugify(input.name);
  const slug = uniqueGrupoSlug(db.grupos, base);
  const grupo: Grupo = { ...input, id: id("g"), slug, createdAt: new Date().toISOString() };
  db.grupos.push(grupo);
  write(db);
  return grupo;
}

export async function updateGrupo(
  gid: string,
  patch: Partial<Grupo>,
): Promise<Grupo | undefined> {
  const db = read();
  const g = db.grupos.find((x) => x.id === gid);
  if (!g) return undefined;
  const { slug, ...rest } = patch;
  Object.assign(g, rest);
  if (slug) {
    g.slug = uniqueGrupoSlug(db.grupos.filter((x) => x.id !== gid), slugify(slug));
  }
  write(db);
  return g;
}

export async function deleteGrupo(gid: string): Promise<boolean> {
  const db = read();
  const before = db.grupos.length;
  db.grupos = db.grupos.filter((g) => g.id !== gid);
  const removed = db.grupos.length < before;
  if (removed) write(db);
  return removed;
}

// --- Sourcing candidates ----------------------------------------
export async function listCandidates(): Promise<SourcingCandidate[]> {
  return read().sourcingCandidates.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCandidateById(cid: string): Promise<SourcingCandidate | undefined> {
  return read().sourcingCandidates.find((c) => c.id === cid);
}

export async function createCandidate(
  input: Omit<SourcingCandidate, "id" | "createdAt">,
): Promise<SourcingCandidate> {
  const db = read();
  const candidate: SourcingCandidate = {
    ...input,
    id: id("s"),
    createdAt: new Date().toISOString(),
  };
  db.sourcingCandidates.push(candidate);
  write(db);
  return candidate;
}

export async function updateCandidate(
  cid: string,
  patch: Partial<SourcingCandidate>,
): Promise<SourcingCandidate | undefined> {
  const db = read();
  const c = db.sourcingCandidates.find((x) => x.id === cid);
  if (!c) return undefined;
  Object.assign(c, patch);
  write(db);
  return c;
}

export async function deleteCandidate(cid: string): Promise<boolean> {
  const db = read();
  const before = db.sourcingCandidates.length;
  db.sourcingCandidates = db.sourcingCandidates.filter((c) => c.id !== cid);
  const removed = db.sourcingCandidates.length < before;
  if (removed) write(db);
  return removed;
}

// --- Suppliers --------------------------------------------------
export async function listSuppliers(): Promise<Supplier[]> {
  return read().suppliers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSupplierById(sid: string): Promise<Supplier | undefined> {
  return read().suppliers.find((s) => s.id === sid);
}

export async function createSupplier(
  input: Omit<Supplier, "id" | "createdAt" | "status"> & { status?: SupplierStatus },
): Promise<Supplier> {
  const db = read();
  const supplier: Supplier = {
    ...input,
    status: input.status ?? "nuevo",
    id: id("sup"),
    createdAt: new Date().toISOString(),
  };
  db.suppliers.push(supplier);
  write(db);
  return supplier;
}

export async function updateSupplier(
  sid: string,
  patch: Partial<Supplier>,
): Promise<Supplier | undefined> {
  const db = read();
  const s = db.suppliers.find((x) => x.id === sid);
  if (!s) return undefined;
  Object.assign(s, patch);
  write(db);
  return s;
}

export async function deleteSupplier(sid: string): Promise<boolean> {
  const db = read();
  const before = db.suppliers.length;
  db.suppliers = db.suppliers.filter((s) => s.id !== sid);
  const removed = db.suppliers.length < before;
  if (removed) write(db);
  return removed;
}

// --- Approval tasks (cerebro de control) ------------------------
export async function listApprovalTasks(
  opts: { status?: ApprovalStatus } = {},
): Promise<ApprovalTask[]> {
  const all = read().approvalTasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return opts.status ? all.filter((t) => t.status === opts.status) : all;
}

export async function getApprovalTaskById(tid: string): Promise<ApprovalTask | undefined> {
  return read().approvalTasks.find((t) => t.id === tid);
}

export async function createApprovalTask(
  input: Omit<ApprovalTask, "id" | "createdAt" | "status"> & { status?: ApprovalStatus },
): Promise<ApprovalTask> {
  const db = read();
  const task: ApprovalTask = {
    ...input,
    status: input.status ?? "pendiente",
    id: id("at"),
    createdAt: new Date().toISOString(),
  };
  db.approvalTasks.push(task);
  write(db);
  return task;
}

export async function updateApprovalTask(
  tid: string,
  patch: Partial<ApprovalTask>,
): Promise<ApprovalTask | undefined> {
  const db = read();
  const t = db.approvalTasks.find((x) => x.id === tid);
  if (!t) return undefined;
  Object.assign(t, patch);
  write(db);
  return t;
}

export async function deleteApprovalTask(tid: string): Promise<boolean> {
  const db = read();
  const before = db.approvalTasks.length;
  db.approvalTasks = db.approvalTasks.filter((t) => t.id !== tid);
  const removed = db.approvalTasks.length < before;
  if (removed) write(db);
  return removed;
}

// --- Agent runs (bitácora) --------------------------------------
export async function listAgentRuns(limit = 50): Promise<AgentRun[]> {
  return read()
    .agentRuns.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function createAgentRun(input: Omit<AgentRun, "id" | "createdAt">): Promise<AgentRun> {
  const db = read();
  const run: AgentRun = { ...input, id: id("run"), createdAt: new Date().toISOString() };
  db.agentRuns.push(run);
  write(db);
  return run;
}

// --- Quotes (cotizaciones) --------------------------------------
export async function listQuotes(): Promise<Quote[]> {
  return read().quotes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createQuote(input: Omit<Quote, "id" | "createdAt">): Promise<Quote> {
  const db = read();
  const quote: Quote = { ...input, id: id("q"), createdAt: new Date().toISOString() };
  db.quotes.push(quote);
  write(db);
  return quote;
}

export async function deleteQuote(qid: string): Promise<boolean> {
  const db = read();
  const before = db.quotes.length;
  db.quotes = db.quotes.filter((q) => q.id !== qid);
  const removed = db.quotes.length < before;
  if (removed) write(db);
  return removed;
}

// --- Purchase orders (órdenes de compra) ------------------------
export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  return read().purchaseOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getPurchaseOrderById(pid: string): Promise<PurchaseOrder | undefined> {
  return read().purchaseOrders.find((p) => p.id === pid);
}

export async function createPurchaseOrder(
  input: Omit<PurchaseOrder, "id" | "createdAt" | "status"> & { status?: PurchaseOrderStatus },
): Promise<PurchaseOrder> {
  const db = read();
  const po: PurchaseOrder = {
    ...input,
    status: input.status ?? "borrador",
    id: id("po"),
    createdAt: new Date().toISOString(),
  };
  db.purchaseOrders.push(po);
  write(db);
  return po;
}

export async function updatePurchaseOrder(
  pid: string,
  patch: Partial<PurchaseOrder>,
): Promise<PurchaseOrder | undefined> {
  const db = read();
  const p = db.purchaseOrders.find((x) => x.id === pid);
  if (!p) return undefined;
  Object.assign(p, patch);
  write(db);
  return p;
}

export async function deletePurchaseOrder(pid: string): Promise<boolean> {
  const db = read();
  const before = db.purchaseOrders.length;
  db.purchaseOrders = db.purchaseOrders.filter((p) => p.id !== pid);
  const removed = db.purchaseOrders.length < before;
  if (removed) write(db);
  return removed;
}

// --- Shipments (embarques) --------------------------------------
export async function listShipments(): Promise<Shipment[]> {
  return read().shipments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createShipment(
  input: Omit<Shipment, "id" | "createdAt" | "status"> & { status?: ShipmentStatus },
): Promise<Shipment> {
  const db = read();
  const shipment: Shipment = {
    ...input,
    status: input.status ?? "preparando",
    id: id("sh"),
    createdAt: new Date().toISOString(),
  };
  db.shipments.push(shipment);
  write(db);
  return shipment;
}

export async function updateShipment(
  sid: string,
  patch: Partial<Shipment>,
): Promise<Shipment | undefined> {
  const db = read();
  const s = db.shipments.find((x) => x.id === sid);
  if (!s) return undefined;
  Object.assign(s, patch);
  write(db);
  return s;
}

export async function deleteShipment(sid: string): Promise<boolean> {
  const db = read();
  const before = db.shipments.length;
  db.shipments = db.shipments.filter((s) => s.id !== sid);
  const removed = db.shipments.length < before;
  if (removed) write(db);
  return removed;
}

// --- Inventory movements (inventario) ---------------------------
export async function listInventoryMovements(
  opts: { productId?: string; limit?: number } = {},
): Promise<InventoryMovement[]> {
  let all = read().inventoryMovements.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (opts.productId) all = all.filter((m) => m.productId === opts.productId);
  return all.slice(0, opts.limit ?? 200);
}

export async function createInventoryMovement(
  input: Omit<InventoryMovement, "id" | "createdAt">,
): Promise<InventoryMovement> {
  const db = read();
  const mv: InventoryMovement = { ...input, id: id("mv"), createdAt: new Date().toISOString() };
  db.inventoryMovements.push(mv);
  write(db);
  return mv;
}

// --- Campaigns (promociones) ------------------------------------
export async function listCampaigns(): Promise<Campaign[]> {
  return read().campaigns.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCampaignById(cid: string): Promise<Campaign | undefined> {
  return read().campaigns.find((c) => c.id === cid);
}

export async function createCampaign(
  input: Omit<Campaign, "id" | "createdAt" | "status"> & { status?: CampaignStatus },
): Promise<Campaign> {
  const db = read();
  const campaign: Campaign = {
    ...input,
    status: input.status ?? "borrador",
    id: id("camp"),
    createdAt: new Date().toISOString(),
  };
  db.campaigns.push(campaign);
  write(db);
  return campaign;
}

export async function updateCampaign(
  cid: string,
  patch: Partial<Campaign>,
): Promise<Campaign | undefined> {
  const db = read();
  const c = db.campaigns.find((x) => x.id === cid);
  if (!c) return undefined;
  Object.assign(c, patch);
  write(db);
  return c;
}

export async function deleteCampaign(cid: string): Promise<boolean> {
  const db = read();
  const before = db.campaigns.length;
  db.campaigns = db.campaigns.filter((c) => c.id !== cid);
  const removed = db.campaigns.length < before;
  if (removed) write(db);
  return removed;
}
