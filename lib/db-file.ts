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
const TMP_FILE = `${DB_FILE}.tmp`;
const LOCK_FILE = `${DB_FILE}.lock`;

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
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  // Archivo AUSENTE: estado de primer arranque → sembrar es correcto.
  if (!fs.existsSync(DB_FILE)) {
    const initial = seed();
    writeRaw(initial);
    return initial;
  }
  // Archivo PRESENTE: si el parse falla, está corrupto. NUNCA re-sembrar aquí
  // (eso borraría datos reales). Preservamos el archivo dañado y relanzamos.
  let raw: string;
  try {
    raw = fs.readFileSync(DB_FILE, "utf8");
  } catch (e) {
    throw new Error(`[db-file] No se pudo leer ${DB_FILE}: ${(e as Error).message}`);
  }
  let parsed: Partial<DB>;
  try {
    parsed = JSON.parse(raw) as Partial<DB>;
  } catch (e) {
    const backup = `${DB_FILE}.corrupt-${Date.now()}`;
    try {
      fs.renameSync(DB_FILE, backup);
    } catch {
      /* si ni renombrar se puede, igual relanzamos abajo */
    }
    console.error(
      `[db-file] ⛔ db.json corrupto (parse falló). NO se re-siembra para no destruir datos. ` +
        `Copia preservada en ${backup}. Error: ${(e as Error).message}`,
    );
    throw new Error(`[db-file] db.json corrupto; respaldado en ${backup}`);
  }
  return migrate(parsed);
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
  // Solo re-sembramos cuando la clave NO existe (store viejo). Un arreglo vacío
  // es un estado legítimo (borrar todos los productos) y NO debe resucitar el
  // catálogo semilla.
  if (db.products === undefined) {
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
  if (dirty) writeRaw(full);
  return full;
}

/**
 * Escritura ATÓMICA: escribe a un archivo temporal y luego `renameSync` (atómico
 * en el mismo filesystem) para que un crash a mitad de escritura no deje un
 * db.json truncado/corrupto. No toma el lock — los llamadores que hacen
 * read-modify-write deben envolverse en `mutate()`.
 */
function writeRaw(db: DB): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TMP_FILE, JSON.stringify(db, null, 2));
  fs.renameSync(TMP_FILE, DB_FILE);
}

/**
 * Lock entre procesos (best-effort). El CLI del operador, los scripts tsx y el
 * dev server comparten el mismo db.json; sin esto, dos read-modify-write
 * concurrentes se pisan (last-write-wins) y se pierden escrituras.
 *
 * LIMITACIÓN: es un lock cooperativo basado en `open(..., "wx")` sobre un
 * archivo `.lock`. Es síncrono y bloqueante (busy-wait corto). Si un proceso
 * muere sin liberar, el lock se considera "stale" pasado `LOCK_STALE_MS` y se
 * roba. Esto NO sustituye una base de datos real con transacciones — para
 * concurrencia seria, usar Postgres (DATABASE_URL).
 */
const LOCK_STALE_MS = 5000;
const LOCK_RETRY_MS = 15;
const LOCK_MAX_WAIT_MS = 4000;

function spinWait(ms: number): void {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    /* busy-wait corto: este store es síncrono por diseño */
  }
}

function acquireLock(): boolean {
  const deadline = Date.now() + LOCK_MAX_WAIT_MS;
  for (;;) {
    try {
      const fd = fs.openSync(LOCK_FILE, "wx");
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      return true;
    } catch {
      // Lock tomado. ¿Es stale (proceso muerto que no lo liberó)?
      try {
        const age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
        if (age > LOCK_STALE_MS) {
          try {
            fs.unlinkSync(LOCK_FILE);
          } catch {
            /* otro proceso lo robó primero */
          }
          continue;
        }
      } catch {
        /* el lock desapareció entre el catch y el stat → reintenta */
      }
      if (Date.now() > deadline) return false; // best-effort: seguimos sin lock
      spinWait(LOCK_RETRY_MS);
    }
  }
}

function releaseLock(held: boolean): void {
  if (!held) return;
  try {
    fs.unlinkSync(LOCK_FILE);
  } catch {
    /* ya liberado */
  }
}

/**
 * Read-modify-write SERIALIZADO. Toma el lock, lee el estado fresco del disco,
 * deja que `fn` lo mute, persiste atómicamente y libera. Todas las escrituras
 * pasan por aquí para que dos procesos no se pisen.
 */
function mutate<T>(fn: (db: DB) => T): T {
  const held = acquireLock();
  try {
    const db = read();
    const result = fn(db);
    writeRaw(db);
    return result;
  } finally {
    releaseLock(held);
  }
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
  return mutate((db) => {
    const business: Business = {
      ...input,
      // Normaliza el email a minúsculas (paridad con la búsqueda case-insensitive
      // de getBusinessByEmail y con lo que persiste el adaptador Postgres).
      email: input.email.toLowerCase(),
      id: id("b"),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    db.businesses.push(business);
    return business;
  });
}

export async function setBusinessStatus(
  bid: string,
  status: Business["status"],
): Promise<Business | undefined> {
  return mutate((db) => {
    const b = db.businesses.find((x) => x.id === bid);
    if (!b) return undefined;
    b.status = status;
    return b;
  });
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
  return mutate((db) => {
    // `...input` arrastra todos los campos del Order, incluido el opcional
    // `athEcommerceId` (id de transacción de ATH Móvil) cuando viene presente.
    const order: Order = {
      ...input,
      id: id("o"),
      status: "nuevo",
      createdAt: new Date().toISOString(),
    };
    db.orders.push(order);
    return order;
  });
}

export async function updateOrder(
  oid: string,
  patch: Partial<Order>,
): Promise<Order | undefined> {
  return mutate((db) => {
    const o = db.orders.find((x) => x.id === oid);
    if (!o) return undefined;
    Object.assign(o, patch);
    return o;
  });
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
  return mutate((db) => {
    const base = input.slug?.trim() ? slugify(input.slug) : slugify(input.name);
    const slug = uniqueSlug(db.products, base);
    const product: Product = { ...input, id: id("p"), slug };
    db.products.push(product);
    return product;
  });
}

export async function updateProduct(
  pid: string,
  patch: Partial<Product>,
): Promise<Product | undefined> {
  return mutate((db) => {
    const p = db.products.find((x) => x.id === pid);
    if (!p) return undefined;
    const { slug, ...rest } = patch;
    Object.assign(p, rest);
    // slug === "" no debe sobrescribir el slug existente con vacío (paridad con pg).
    if (slug) {
      p.slug = uniqueSlug(db.products.filter((x) => x.id !== pid), slugify(slug));
    }
    return p;
  });
}

export async function deleteProduct(pid: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.products.length;
    db.products = db.products.filter((p) => p.id !== pid);
    return db.products.length < before;
  });
}

/**
 * Ajuste ATÓMICO de stock (A-7). Lee el stock fresco bajo lock, aplica el delta
 * con piso en 0 y persiste en UNA sola operación read-modify-write. Devuelve el
 * producto resultante y el delta REALMENTE aplicado (`next - current`), para que
 * el llamador (lib/inventory.ts) registre el movimiento con ese mismo valor y se
 * preserve el invariante `stock === Σ movimientos`. `null` si el producto no
 * existe.
 */
export async function adjustProductStock(
  pid: string,
  delta: number,
): Promise<{ product: Product; applied: number } | null> {
  return mutate((db) => {
    const p = db.products.find((x) => x.id === pid);
    if (!p) return null;
    const current = p.stock ?? 0;
    const next = Math.max(0, current + delta);
    p.stock = next;
    return { product: p, applied: next - current };
  });
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
  return mutate((db) => {
    const base = input.slug?.trim() ? slugify(input.slug) : slugify(input.name);
    const slug = uniqueGrupoSlug(db.grupos, base);
    const grupo: Grupo = { ...input, id: id("g"), slug, createdAt: new Date().toISOString() };
    db.grupos.push(grupo);
    return grupo;
  });
}

export async function updateGrupo(
  gid: string,
  patch: Partial<Grupo>,
): Promise<Grupo | undefined> {
  return mutate((db) => {
    const g = db.grupos.find((x) => x.id === gid);
    if (!g) return undefined;
    const { slug, ...rest } = patch;
    Object.assign(g, rest);
    if (slug) {
      g.slug = uniqueGrupoSlug(db.grupos.filter((x) => x.id !== gid), slugify(slug));
    }
    return g;
  });
}

export async function deleteGrupo(gid: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.grupos.length;
    db.grupos = db.grupos.filter((g) => g.id !== gid);
    return db.grupos.length < before;
  });
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
  return mutate((db) => {
    const candidate: SourcingCandidate = {
      ...input,
      id: id("s"),
      createdAt: new Date().toISOString(),
    };
    db.sourcingCandidates.push(candidate);
    return candidate;
  });
}

export async function updateCandidate(
  cid: string,
  patch: Partial<SourcingCandidate>,
): Promise<SourcingCandidate | undefined> {
  return mutate((db) => {
    const c = db.sourcingCandidates.find((x) => x.id === cid);
    if (!c) return undefined;
    Object.assign(c, patch);
    return c;
  });
}

export async function deleteCandidate(cid: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.sourcingCandidates.length;
    db.sourcingCandidates = db.sourcingCandidates.filter((c) => c.id !== cid);
    return db.sourcingCandidates.length < before;
  });
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
  return mutate((db) => {
    const supplier: Supplier = {
      ...input,
      status: input.status ?? "nuevo",
      id: id("sup"),
      createdAt: new Date().toISOString(),
    };
    db.suppliers.push(supplier);
    return supplier;
  });
}

export async function updateSupplier(
  sid: string,
  patch: Partial<Supplier>,
): Promise<Supplier | undefined> {
  return mutate((db) => {
    const s = db.suppliers.find((x) => x.id === sid);
    if (!s) return undefined;
    Object.assign(s, patch);
    return s;
  });
}

export async function deleteSupplier(sid: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.suppliers.length;
    db.suppliers = db.suppliers.filter((s) => s.id !== sid);
    return db.suppliers.length < before;
  });
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
  return mutate((db) => {
    const task: ApprovalTask = {
      ...input,
      status: input.status ?? "pendiente",
      id: id("at"),
      createdAt: new Date().toISOString(),
    };
    db.approvalTasks.push(task);
    return task;
  });
}

export async function updateApprovalTask(
  tid: string,
  patch: Partial<ApprovalTask>,
): Promise<ApprovalTask | undefined> {
  return mutate((db) => {
    const t = db.approvalTasks.find((x) => x.id === tid);
    if (!t) return undefined;
    Object.assign(t, patch);
    return t;
  });
}

export async function deleteApprovalTask(tid: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.approvalTasks.length;
    db.approvalTasks = db.approvalTasks.filter((t) => t.id !== tid);
    return db.approvalTasks.length < before;
  });
}

// --- Agent runs (bitácora) --------------------------------------
export async function listAgentRuns(limit = 50): Promise<AgentRun[]> {
  return read()
    .agentRuns.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function createAgentRun(input: Omit<AgentRun, "id" | "createdAt">): Promise<AgentRun> {
  return mutate((db) => {
    const run: AgentRun = { ...input, id: id("run"), createdAt: new Date().toISOString() };
    db.agentRuns.push(run);
    return run;
  });
}

// --- Quotes (cotizaciones) --------------------------------------
export async function listQuotes(): Promise<Quote[]> {
  return read().quotes.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createQuote(input: Omit<Quote, "id" | "createdAt">): Promise<Quote> {
  return mutate((db) => {
    const quote: Quote = { ...input, id: id("q"), createdAt: new Date().toISOString() };
    db.quotes.push(quote);
    return quote;
  });
}

export async function deleteQuote(qid: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.quotes.length;
    db.quotes = db.quotes.filter((q) => q.id !== qid);
    return db.quotes.length < before;
  });
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
  return mutate((db) => {
    const po: PurchaseOrder = {
      ...input,
      status: input.status ?? "borrador",
      id: id("po"),
      createdAt: new Date().toISOString(),
    };
    db.purchaseOrders.push(po);
    return po;
  });
}

export async function updatePurchaseOrder(
  pid: string,
  patch: Partial<PurchaseOrder>,
): Promise<PurchaseOrder | undefined> {
  return mutate((db) => {
    const p = db.purchaseOrders.find((x) => x.id === pid);
    if (!p) return undefined;
    Object.assign(p, patch);
    return p;
  });
}

export async function deletePurchaseOrder(pid: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.purchaseOrders.length;
    db.purchaseOrders = db.purchaseOrders.filter((p) => p.id !== pid);
    return db.purchaseOrders.length < before;
  });
}

// --- Shipments (embarques) --------------------------------------
export async function listShipments(): Promise<Shipment[]> {
  return read().shipments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createShipment(
  input: Omit<Shipment, "id" | "createdAt" | "status"> & { status?: ShipmentStatus },
): Promise<Shipment> {
  return mutate((db) => {
    const shipment: Shipment = {
      ...input,
      status: input.status ?? "preparando",
      id: id("sh"),
      createdAt: new Date().toISOString(),
    };
    db.shipments.push(shipment);
    return shipment;
  });
}

export async function updateShipment(
  sid: string,
  patch: Partial<Shipment>,
): Promise<Shipment | undefined> {
  return mutate((db) => {
    const s = db.shipments.find((x) => x.id === sid);
    if (!s) return undefined;
    Object.assign(s, patch);
    return s;
  });
}

export async function deleteShipment(sid: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.shipments.length;
    db.shipments = db.shipments.filter((s) => s.id !== sid);
    return db.shipments.length < before;
  });
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
  return mutate((db) => {
    const mv: InventoryMovement = { ...input, id: id("mv"), createdAt: new Date().toISOString() };
    db.inventoryMovements.push(mv);
    return mv;
  });
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
  return mutate((db) => {
    const campaign: Campaign = {
      ...input,
      status: input.status ?? "borrador",
      id: id("camp"),
      createdAt: new Date().toISOString(),
    };
    db.campaigns.push(campaign);
    return campaign;
  });
}

export async function updateCampaign(
  cid: string,
  patch: Partial<Campaign>,
): Promise<Campaign | undefined> {
  return mutate((db) => {
    const c = db.campaigns.find((x) => x.id === cid);
    if (!c) return undefined;
    Object.assign(c, patch);
    return c;
  });
}

export async function deleteCampaign(cid: string): Promise<boolean> {
  return mutate((db) => {
    const before = db.campaigns.length;
    db.campaigns = db.campaigns.filter((c) => c.id !== cid);
    return db.campaigns.length < before;
  });
}
