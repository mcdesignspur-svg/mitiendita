/**
 * Capa de datos conmutable.
 *
 * - Si hay DATABASE_URL  → usa Postgres/Neon (lib/db-postgres.ts).
 * - Si NO hay DATABASE_URL → usa el archivo local (lib/db-file.ts).
 *
 * IMPORTANTE: el adaptador se resuelve en CADA llamada (no al cargar el módulo).
 * Si se fijara al cargar, una ruta que importe este módulo antes de que
 * DATABASE_URL esté disponible se quedaría con el adaptador equivocado.
 * Ambos adaptadores exponen el mismo contrato async.
 */
import * as file from "./db-file";
import * as pg from "./db-postgres";

function impl() {
  return process.env.DATABASE_URL ? pg : file;
}

/** True cuando la app está usando Postgres/Neon. */
export function usingPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function bind<K extends keyof typeof pg & keyof typeof file>(k: K): (typeof pg)[K] {
  const fn = (...args: unknown[]) =>
    (impl()[k] as unknown as (...a: unknown[]) => unknown)(...args);
  return fn as unknown as (typeof pg)[K];
}

// Businesses
export const listBusinesses = bind("listBusinesses");
export const getBusinessById = bind("getBusinessById");
export const getBusinessByEmail = bind("getBusinessByEmail");
export const createBusiness = bind("createBusiness");
export const setBusinessStatus = bind("setBusinessStatus");

// Orders
export const listOrders = bind("listOrders");
export const getOrderById = bind("getOrderById");
export const createOrder = bind("createOrder");
export const updateOrder = bind("updateOrder");

// Products
export const listProducts = bind("listProducts");
export const getProductBySlug = bind("getProductBySlug");
export const getProductById = bind("getProductById");
export const createProduct = bind("createProduct");
export const updateProduct = bind("updateProduct");
export const deleteProduct = bind("deleteProduct");
export const relatedProducts = bind("relatedProducts");
export const listCategories = bind("listCategories");

// Grupos (curaduría de catálogo)
export const listGrupos = bind("listGrupos");
export const getGrupoById = bind("getGrupoById");
export const createGrupo = bind("createGrupo");
export const updateGrupo = bind("updateGrupo");
export const deleteGrupo = bind("deleteGrupo");

// Sourcing candidates (columna operativa)
export const listCandidates = bind("listCandidates");
export const getCandidateById = bind("getCandidateById");
export const createCandidate = bind("createCandidate");
export const updateCandidate = bind("updateCandidate");
export const deleteCandidate = bind("deleteCandidate");

// Suppliers (columna operativa)
export const listSuppliers = bind("listSuppliers");
export const getSupplierById = bind("getSupplierById");
export const createSupplier = bind("createSupplier");
export const updateSupplier = bind("updateSupplier");
export const deleteSupplier = bind("deleteSupplier");

// Approval tasks (cerebro de control)
export const listApprovalTasks = bind("listApprovalTasks");
export const getApprovalTaskById = bind("getApprovalTaskById");
export const createApprovalTask = bind("createApprovalTask");
export const updateApprovalTask = bind("updateApprovalTask");
export const deleteApprovalTask = bind("deleteApprovalTask");

// Agent runs (bitácora)
export const listAgentRuns = bind("listAgentRuns");
export const createAgentRun = bind("createAgentRun");

// Quotes (cotizaciones)
export const listQuotes = bind("listQuotes");
export const createQuote = bind("createQuote");
export const deleteQuote = bind("deleteQuote");

// Purchase orders (órdenes de compra)
export const listPurchaseOrders = bind("listPurchaseOrders");
export const getPurchaseOrderById = bind("getPurchaseOrderById");
export const createPurchaseOrder = bind("createPurchaseOrder");
export const updatePurchaseOrder = bind("updatePurchaseOrder");
export const deletePurchaseOrder = bind("deletePurchaseOrder");

// Shipments (embarques)
export const listShipments = bind("listShipments");
export const createShipment = bind("createShipment");
export const updateShipment = bind("updateShipment");
export const deleteShipment = bind("deleteShipment");

// Inventory movements (inventario)
export const listInventoryMovements = bind("listInventoryMovements");
export const createInventoryMovement = bind("createInventoryMovement");

// Campaigns (promociones)
export const listCampaigns = bind("listCampaigns");
export const getCampaignById = bind("getCampaignById");
export const createCampaign = bind("createCampaign");
export const updateCampaign = bind("updateCampaign");
export const deleteCampaign = bind("deleteCampaign");
