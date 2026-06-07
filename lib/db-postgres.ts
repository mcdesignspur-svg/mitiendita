import crypto from "node:crypto";
import { eq, ne, desc } from "drizzle-orm";
import { getDb } from "./drizzle";
import { products, grupos, businesses, orders, sourcingCandidates, suppliers, approvalTasks, agentRuns, quotes, purchaseOrders, shipments, inventoryMovements, campaigns } from "./schema";
import { slugify } from "./products";
import type {
  AgentRun,
  ApprovalKind,
  ApprovalStatus,
  ApprovalTask,
  AgentName,
  Business,
  BusinessStatus,
  BusinessType,
  Campaign,
  CampaignStatus,
  Grupo,
  InventoryMovement,
  InventoryReason,
  Order,
  Product,
  PurchaseOrder,
  PurchaseOrderStatus,
  PurchaseOrderPayment,
  Quote,
  Shipment,
  ShipmentStatus,
  SourcingCandidate,
  SourcingStage,
  Supplier,
  SupplierStatus,
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
    imageUrl: r.imageUrl ?? undefined,
    category: r.category,
    grupoIds: r.grupoIds ?? [],
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
    paymentStatus: (r.paymentStatus as Order["paymentStatus"]) ?? undefined,
    paymentMethod: (r.paymentMethod as Order["paymentMethod"]) ?? undefined,
    stripeSessionId: r.stripeSessionId ?? undefined,
    paymentRef: r.paymentRef ?? undefined,
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

export async function updateOrder(
  oid: string,
  patch: Partial<Order>,
): Promise<Order | undefined> {
  const rows = await getDb().update(orders).set(patch).where(eq(orders.id, oid)).returning();
  return rows[0] ? toOrder(rows[0]) : undefined;
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

// --- Grupos -----------------------------------------------------
type GrupoRow = typeof grupos.$inferSelect;

function toGrupo(r: GrupoRow): Grupo {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    emoji: r.emoji,
    description: r.description ?? undefined,
    color: r.color ?? undefined,
    createdAt: r.createdAt,
  };
}

export async function listGrupos(): Promise<Grupo[]> {
  const rows = await getDb().select().from(grupos).orderBy(grupos.name);
  return rows.map(toGrupo);
}

export async function getGrupoById(gid: string): Promise<Grupo | undefined> {
  const rows = await getDb().select().from(grupos).where(eq(grupos.id, gid)).limit(1);
  return rows[0] ? toGrupo(rows[0]) : undefined;
}

export async function createGrupo(
  input: Omit<Grupo, "id" | "slug" | "createdAt"> & { slug?: string },
): Promise<Grupo> {
  const db = getDb();
  const existing = await db.select({ slug: grupos.slug }).from(grupos);
  const base = input.slug?.trim() ? slugify(input.slug) : slugify(input.name);
  const slug = uniqueSlug(existing.map((r) => r.slug), base);
  const grupo: Grupo = { ...input, id: newId("g"), slug, createdAt: new Date().toISOString() };
  const rows = await db.insert(grupos).values(grupo).returning();
  return toGrupo(rows[0]);
}

export async function updateGrupo(
  gid: string,
  patch: Partial<Grupo>,
): Promise<Grupo | undefined> {
  const db = getDb();
  const set: Partial<typeof grupos.$inferInsert> = { ...patch };
  if (patch.slug) {
    const others = await db.select({ slug: grupos.slug }).from(grupos).where(ne(grupos.id, gid));
    set.slug = uniqueSlug(others.map((r) => r.slug), slugify(patch.slug));
  }
  const rows = await db.update(grupos).set(set).where(eq(grupos.id, gid)).returning();
  return rows[0] ? toGrupo(rows[0]) : undefined;
}

export async function deleteGrupo(gid: string): Promise<boolean> {
  const rows = await getDb().delete(grupos).where(eq(grupos.id, gid)).returning({ id: grupos.id });
  return rows.length > 0;
}

// --- Sourcing candidates ---------------------------------------
type CandidateRow = typeof sourcingCandidates.$inferSelect;

function toCandidate(r: CandidateRow): SourcingCandidate {
  return {
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    category: r.category,
    supplier: r.supplier,
    supplierId: r.supplierId ?? undefined,
    unitCost: r.unitCost,
    estRetail: r.estRetail,
    estWholesale: r.estWholesale ?? undefined,
    moq: r.moq ?? undefined,
    trend: r.trend,
    shipping: r.shipping,
    stage: r.stage as SourcingStage,
    signal: r.signal,
    sourceUrl: r.sourceUrl ?? undefined,
    imageUrl: r.imageUrl ?? undefined,
    notes: r.notes ?? undefined,
    origin: r.origin as SourcingCandidate["origin"],
    productId: r.productId ?? undefined,
    createdAt: r.createdAt,
  };
}

export async function listCandidates(): Promise<SourcingCandidate[]> {
  const rows = await getDb().select().from(sourcingCandidates).orderBy(desc(sourcingCandidates.seq));
  return rows.map(toCandidate);
}

export async function getCandidateById(id: string): Promise<SourcingCandidate | undefined> {
  const rows = await getDb().select().from(sourcingCandidates).where(eq(sourcingCandidates.id, id)).limit(1);
  return rows[0] ? toCandidate(rows[0]) : undefined;
}

export async function createCandidate(
  input: Omit<SourcingCandidate, "id" | "createdAt">,
): Promise<SourcingCandidate> {
  const candidate: SourcingCandidate = {
    ...input,
    id: newId("s"),
    createdAt: new Date().toISOString(),
  };
  await getDb().insert(sourcingCandidates).values(candidate);
  return candidate;
}

export async function updateCandidate(
  id: string,
  patch: Partial<SourcingCandidate>,
): Promise<SourcingCandidate | undefined> {
  const rows = await getDb()
    .update(sourcingCandidates)
    .set(patch)
    .where(eq(sourcingCandidates.id, id))
    .returning();
  return rows[0] ? toCandidate(rows[0]) : undefined;
}

export async function deleteCandidate(id: string): Promise<boolean> {
  const rows = await getDb()
    .delete(sourcingCandidates)
    .where(eq(sourcingCandidates.id, id))
    .returning({ id: sourcingCandidates.id });
  return rows.length > 0;
}

// --- Suppliers --------------------------------------------------
type SupplierRow = typeof suppliers.$inferSelect;

function toSupplier(r: SupplierRow): Supplier {
  return {
    id: r.id,
    name: r.name,
    platform: r.platform,
    url: r.url ?? undefined,
    contactName: r.contactName ?? undefined,
    email: r.email ?? undefined,
    whatsapp: r.whatsapp ?? undefined,
    country: r.country ?? undefined,
    products: r.products ?? undefined,
    status: r.status as SupplierStatus,
    outreachDraft: r.outreachDraft ?? undefined,
    notes: r.notes ?? undefined,
    createdAt: r.createdAt,
    lastContactedAt: r.lastContactedAt ?? undefined,
  };
}

export async function listSuppliers(): Promise<Supplier[]> {
  const rows = await getDb().select().from(suppliers).orderBy(desc(suppliers.seq));
  return rows.map(toSupplier);
}

export async function getSupplierById(id: string): Promise<Supplier | undefined> {
  const rows = await getDb().select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return rows[0] ? toSupplier(rows[0]) : undefined;
}

export async function createSupplier(
  input: Omit<Supplier, "id" | "createdAt" | "status"> & { status?: SupplierStatus },
): Promise<Supplier> {
  const supplier: Supplier = {
    ...input,
    status: input.status ?? "nuevo",
    id: newId("sup"),
    createdAt: new Date().toISOString(),
  };
  await getDb().insert(suppliers).values(supplier);
  return supplier;
}

export async function updateSupplier(
  id: string,
  patch: Partial<Supplier>,
): Promise<Supplier | undefined> {
  const rows = await getDb().update(suppliers).set(patch).where(eq(suppliers.id, id)).returning();
  return rows[0] ? toSupplier(rows[0]) : undefined;
}

export async function deleteSupplier(id: string): Promise<boolean> {
  const rows = await getDb().delete(suppliers).where(eq(suppliers.id, id)).returning({ id: suppliers.id });
  return rows.length > 0;
}

// --- Approval tasks (cerebro de control) ------------------------
type ApprovalTaskRow = typeof approvalTasks.$inferSelect;

function toApprovalTask(r: ApprovalTaskRow): ApprovalTask {
  return {
    id: r.id,
    kind: r.kind as ApprovalKind,
    title: r.title,
    summary: r.summary,
    status: r.status as ApprovalStatus,
    createdBy: r.createdBy as AgentName,
    payload: r.payload ?? undefined,
    relatedType: (r.relatedType as ApprovalTask["relatedType"]) ?? undefined,
    relatedId: r.relatedId ?? undefined,
    decidedAt: r.decidedAt ?? undefined,
    decisionNote: r.decisionNote ?? undefined,
    executedAt: r.executedAt ?? undefined,
    createdAt: r.createdAt,
  };
}

export async function listApprovalTasks(
  opts: { status?: ApprovalStatus } = {},
): Promise<ApprovalTask[]> {
  const db = getDb();
  const rows = opts.status
    ? await db.select().from(approvalTasks).where(eq(approvalTasks.status, opts.status)).orderBy(desc(approvalTasks.seq))
    : await db.select().from(approvalTasks).orderBy(desc(approvalTasks.seq));
  return rows.map(toApprovalTask);
}

export async function getApprovalTaskById(id: string): Promise<ApprovalTask | undefined> {
  const rows = await getDb().select().from(approvalTasks).where(eq(approvalTasks.id, id)).limit(1);
  return rows[0] ? toApprovalTask(rows[0]) : undefined;
}

export async function createApprovalTask(
  input: Omit<ApprovalTask, "id" | "createdAt" | "status"> & { status?: ApprovalStatus },
): Promise<ApprovalTask> {
  const task: ApprovalTask = {
    ...input,
    status: input.status ?? "pendiente",
    id: newId("at"),
    createdAt: new Date().toISOString(),
  };
  await getDb().insert(approvalTasks).values(task);
  return task;
}

export async function updateApprovalTask(
  id: string,
  patch: Partial<ApprovalTask>,
): Promise<ApprovalTask | undefined> {
  const rows = await getDb().update(approvalTasks).set(patch).where(eq(approvalTasks.id, id)).returning();
  return rows[0] ? toApprovalTask(rows[0]) : undefined;
}

export async function deleteApprovalTask(id: string): Promise<boolean> {
  const rows = await getDb().delete(approvalTasks).where(eq(approvalTasks.id, id)).returning({ id: approvalTasks.id });
  return rows.length > 0;
}

// --- Agent runs (bitácora) --------------------------------------
type AgentRunRow = typeof agentRuns.$inferSelect;

function toAgentRun(r: AgentRunRow): AgentRun {
  return {
    id: r.id,
    agent: r.agent as AgentName,
    action: r.action,
    status: r.status as AgentRun["status"],
    summary: r.summary,
    meta: r.meta ?? undefined,
    createdAt: r.createdAt,
  };
}

export async function listAgentRuns(limit = 50): Promise<AgentRun[]> {
  const rows = await getDb().select().from(agentRuns).orderBy(desc(agentRuns.seq)).limit(limit);
  return rows.map(toAgentRun);
}

export async function createAgentRun(input: Omit<AgentRun, "id" | "createdAt">): Promise<AgentRun> {
  const run: AgentRun = { ...input, id: newId("run"), createdAt: new Date().toISOString() };
  await getDb().insert(agentRuns).values(run);
  return run;
}

// --- Quotes (cotizaciones) --------------------------------------
type QuoteRow = typeof quotes.$inferSelect;

function toQuote(r: QuoteRow): Quote {
  return {
    id: r.id,
    supplierId: r.supplierId ?? undefined,
    supplierName: r.supplierName,
    candidateId: r.candidateId ?? undefined,
    productName: r.productName,
    unitCost: r.unitCost,
    moq: r.moq ?? undefined,
    leadTimeDays: r.leadTimeDays ?? undefined,
    sampleCost: r.sampleCost ?? undefined,
    shippingToPR: r.shippingToPR ?? undefined,
    currency: r.currency ?? undefined,
    validUntil: r.validUntil ?? undefined,
    notes: r.notes ?? undefined,
    origin: r.origin as AgentName,
    createdAt: r.createdAt,
  };
}

export async function listQuotes(): Promise<Quote[]> {
  const rows = await getDb().select().from(quotes).orderBy(desc(quotes.seq));
  return rows.map(toQuote);
}

export async function createQuote(input: Omit<Quote, "id" | "createdAt">): Promise<Quote> {
  const quote: Quote = { ...input, id: newId("q"), createdAt: new Date().toISOString() };
  await getDb().insert(quotes).values(quote);
  return quote;
}

export async function deleteQuote(id: string): Promise<boolean> {
  const rows = await getDb().delete(quotes).where(eq(quotes.id, id)).returning({ id: quotes.id });
  return rows.length > 0;
}

// --- Purchase orders (órdenes de compra) ------------------------
type PurchaseOrderRow = typeof purchaseOrders.$inferSelect;

function toPurchaseOrder(r: PurchaseOrderRow): PurchaseOrder {
  return {
    id: r.id,
    supplierId: r.supplierId ?? undefined,
    supplierName: r.supplierName,
    candidateId: r.candidateId ?? undefined,
    productId: r.productId ?? undefined,
    quoteId: r.quoteId ?? undefined,
    productName: r.productName,
    qty: r.qty,
    unitCost: r.unitCost,
    shippingCost: r.shippingCost ?? undefined,
    total: r.total,
    currency: r.currency ?? undefined,
    status: r.status as PurchaseOrderStatus,
    paymentMethod: (r.paymentMethod as PurchaseOrderPayment) ?? undefined,
    expectedAt: r.expectedAt ?? undefined,
    notes: r.notes ?? undefined,
    createdBy: r.createdBy as AgentName,
    createdAt: r.createdAt,
  };
}

export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const rows = await getDb().select().from(purchaseOrders).orderBy(desc(purchaseOrders.seq));
  return rows.map(toPurchaseOrder);
}

export async function getPurchaseOrderById(id: string): Promise<PurchaseOrder | undefined> {
  const rows = await getDb().select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
  return rows[0] ? toPurchaseOrder(rows[0]) : undefined;
}

export async function createPurchaseOrder(
  input: Omit<PurchaseOrder, "id" | "createdAt" | "status"> & { status?: PurchaseOrderStatus },
): Promise<PurchaseOrder> {
  const po: PurchaseOrder = {
    ...input,
    status: input.status ?? "borrador",
    id: newId("po"),
    createdAt: new Date().toISOString(),
  };
  await getDb().insert(purchaseOrders).values(po);
  return po;
}

export async function updatePurchaseOrder(
  id: string,
  patch: Partial<PurchaseOrder>,
): Promise<PurchaseOrder | undefined> {
  const rows = await getDb().update(purchaseOrders).set(patch).where(eq(purchaseOrders.id, id)).returning();
  return rows[0] ? toPurchaseOrder(rows[0]) : undefined;
}

export async function deletePurchaseOrder(id: string): Promise<boolean> {
  const rows = await getDb().delete(purchaseOrders).where(eq(purchaseOrders.id, id)).returning({ id: purchaseOrders.id });
  return rows.length > 0;
}

// --- Shipments (embarques) --------------------------------------
type ShipmentRow = typeof shipments.$inferSelect;

function toShipment(r: ShipmentRow): Shipment {
  return {
    id: r.id,
    purchaseOrderId: r.purchaseOrderId,
    productName: r.productName,
    carrier: r.carrier ?? undefined,
    tracking: r.tracking ?? undefined,
    status: r.status as ShipmentStatus,
    etaAt: r.etaAt ?? undefined,
    notes: r.notes ?? undefined,
    createdBy: r.createdBy as AgentName,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt ?? undefined,
  };
}

export async function listShipments(): Promise<Shipment[]> {
  const rows = await getDb().select().from(shipments).orderBy(desc(shipments.seq));
  return rows.map(toShipment);
}

export async function createShipment(
  input: Omit<Shipment, "id" | "createdAt" | "status"> & { status?: ShipmentStatus },
): Promise<Shipment> {
  const shipment: Shipment = {
    ...input,
    status: input.status ?? "preparando",
    id: newId("sh"),
    createdAt: new Date().toISOString(),
  };
  await getDb().insert(shipments).values(shipment);
  return shipment;
}

export async function updateShipment(
  id: string,
  patch: Partial<Shipment>,
): Promise<Shipment | undefined> {
  const rows = await getDb().update(shipments).set(patch).where(eq(shipments.id, id)).returning();
  return rows[0] ? toShipment(rows[0]) : undefined;
}

export async function deleteShipment(id: string): Promise<boolean> {
  const rows = await getDb().delete(shipments).where(eq(shipments.id, id)).returning({ id: shipments.id });
  return rows.length > 0;
}

// --- Inventory movements (inventario) ---------------------------
type InventoryMovementRow = typeof inventoryMovements.$inferSelect;

function toInventoryMovement(r: InventoryMovementRow): InventoryMovement {
  return {
    id: r.id,
    productId: r.productId,
    productName: r.productName,
    delta: r.delta,
    reason: r.reason as InventoryReason,
    ref: r.ref ?? undefined,
    note: r.note ?? undefined,
    createdBy: r.createdBy as AgentName,
    createdAt: r.createdAt,
  };
}

export async function listInventoryMovements(
  opts: { productId?: string; limit?: number } = {},
): Promise<InventoryMovement[]> {
  const db = getDb();
  const rows = opts.productId
    ? await db.select().from(inventoryMovements).where(eq(inventoryMovements.productId, opts.productId)).orderBy(desc(inventoryMovements.seq)).limit(opts.limit ?? 200)
    : await db.select().from(inventoryMovements).orderBy(desc(inventoryMovements.seq)).limit(opts.limit ?? 200);
  return rows.map(toInventoryMovement);
}

export async function createInventoryMovement(
  input: Omit<InventoryMovement, "id" | "createdAt">,
): Promise<InventoryMovement> {
  const mv: InventoryMovement = { ...input, id: newId("mv"), createdAt: new Date().toISOString() };
  await getDb().insert(inventoryMovements).values(mv);
  return mv;
}

// --- Campaigns (promociones) ------------------------------------
type CampaignRow = typeof campaigns.$inferSelect;

function toCampaign(r: CampaignRow): Campaign {
  return {
    id: r.id,
    name: r.name,
    productIds: r.productIds ?? [],
    segment: (r.segment as Campaign["segment"]) ?? undefined,
    discountPercent: r.discountPercent,
    startsAt: r.startsAt ?? undefined,
    endsAt: r.endsAt ?? undefined,
    status: r.status as CampaignStatus,
    copy: r.copy ?? undefined,
    createdBy: r.createdBy as AgentName,
    createdAt: r.createdAt,
  };
}

export async function listCampaigns(): Promise<Campaign[]> {
  const rows = await getDb().select().from(campaigns).orderBy(desc(campaigns.seq));
  return rows.map(toCampaign);
}

export async function getCampaignById(id: string): Promise<Campaign | undefined> {
  const rows = await getDb().select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return rows[0] ? toCampaign(rows[0]) : undefined;
}

export async function createCampaign(
  input: Omit<Campaign, "id" | "createdAt" | "status"> & { status?: CampaignStatus },
): Promise<Campaign> {
  const campaign: Campaign = {
    ...input,
    status: input.status ?? "borrador",
    id: newId("camp"),
    createdAt: new Date().toISOString(),
  };
  await getDb().insert(campaigns).values(campaign);
  return campaign;
}

export async function updateCampaign(
  id: string,
  patch: Partial<Campaign>,
): Promise<Campaign | undefined> {
  const rows = await getDb().update(campaigns).set(patch).where(eq(campaigns.id, id)).returning();
  return rows[0] ? toCampaign(rows[0]) : undefined;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const rows = await getDb().delete(campaigns).where(eq(campaigns.id, id)).returning({ id: campaigns.id });
  return rows.length > 0;
}
