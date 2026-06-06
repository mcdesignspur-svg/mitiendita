/**
 * Capa de datos conmutable.
 *
 * - Si hay DATABASE_URL  → usa Postgres/Neon (lib/db-postgres.ts).
 * - Si NO hay DATABASE_URL → usa el archivo local (lib/db-file.ts).
 *
 * Ambos adaptadores exponen exactamente el mismo contrato async, así que el
 * resto de la app (páginas, acciones, auth) no cambia al migrar de uno a otro.
 */
import * as file from "./db-file";
import * as pg from "./db-postgres";

const impl = process.env.DATABASE_URL ? pg : file;

/** True cuando la app está usando Postgres/Neon. */
export const usingPostgres = Boolean(process.env.DATABASE_URL);

// Businesses
export const listBusinesses: typeof pg.listBusinesses = impl.listBusinesses;
export const getBusinessById: typeof pg.getBusinessById = impl.getBusinessById;
export const getBusinessByEmail: typeof pg.getBusinessByEmail = impl.getBusinessByEmail;
export const createBusiness: typeof pg.createBusiness = impl.createBusiness;
export const setBusinessStatus: typeof pg.setBusinessStatus = impl.setBusinessStatus;

// Orders
export const listOrders: typeof pg.listOrders = impl.listOrders;
export const getOrderById: typeof pg.getOrderById = impl.getOrderById;
export const createOrder: typeof pg.createOrder = impl.createOrder;

// Products
export const listProducts: typeof pg.listProducts = impl.listProducts;
export const getProductBySlug: typeof pg.getProductBySlug = impl.getProductBySlug;
export const getProductById: typeof pg.getProductById = impl.getProductById;
export const createProduct: typeof pg.createProduct = impl.createProduct;
export const updateProduct: typeof pg.updateProduct = impl.updateProduct;
export const deleteProduct: typeof pg.deleteProduct = impl.deleteProduct;
export const relatedProducts: typeof pg.relatedProducts = impl.relatedProducts;
export const listCategories: typeof pg.listCategories = impl.listCategories;
export const listCollections: typeof pg.listCollections = impl.listCollections;
