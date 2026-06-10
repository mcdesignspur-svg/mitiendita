"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getStripe, stripeEnabled } from "./stripe";
import {
  priceCart,
  priceCartForDisplay,
  parseIntentLines,
  isPricedError,
  type CartIntentLine,
  type PricedLine,
} from "./pricing";
import { toCents } from "./money";
import { safeUrl, safeImageUrl } from "./url-safe";
import { rateLimit } from "./rate-limit";
import {
  createBusiness,
  createOrder,
  updateOrder,
  createProduct,
  deleteProduct,
  listProducts,
  getBusinessByEmail,
  getBusinessById,
  getProductById,
  setBusinessStatus,
  updateProduct,
  createGrupo,
  updateGrupo,
  deleteGrupo,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  createSupplier,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
  getApprovalTaskById,
  updateApprovalTask,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  createShipment,
  updateShipment,
  deleteShipment,
  createCampaign,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
} from "./db";
import { createTask, dispatchApproval, draftPurchaseOrder, receivePurchaseOrder, logRun } from "./control";
import { applyOrderInventory } from "./inventory";
import { ingestPayload, type CandidateInput, type SupplierInput, type QuoteInput } from "./ingest";
import {
  checkAdminPassword,
  clearAdminSession,
  clearSession,
  hashPassword,
  isAdmin,
  setAdminSession,
  setSession,
  verifyPassword,
} from "./auth";
import {
  generateMarketingCopy,
  generateProductDraft,
  brainstormCandidates,
  assessBusiness,
  draftSupplierOutreach,
  type CopyResult,
  type ProductDraft,
  type BusinessAssessment,
} from "./ai";
import { GRADIENT_PRESETS } from "./products";
import { notifyOrderConfirmation, notifyBusinessApproved } from "./notify";
import type {
  BusinessType,
  Product,
  Badge,
  Segment,
  SourcingStage,
  SupplierStatus,
  PurchaseOrderStatus,
  ShipmentStatus,
} from "./types";

export type FormState = { error?: string };

export type CopyState = { result?: CopyResult; error?: string };

const VALID_TYPES: BusinessType[] = [
  "gasolinera",
  "farmacia",
  "minimarket",
  "colmado",
  "otro",
];

// --- B2B registro ----------------------------------------------
export async function registerBusinessAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const businessName = String(formData.get("businessName") || "").trim();
  const type = String(formData.get("type") || "otro") as BusinessType;
  const contactName = String(formData.get("contactName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const municipio = String(formData.get("municipio") || "").trim();
  const registroComerciante = String(formData.get("registroComerciante") || "").trim();
  const password = String(formData.get("password") || "");

  if (!businessName || !contactName || !email || !municipio) {
    return { error: "Completa todos los campos requeridos." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Email inválido." };
  }
  if (!VALID_TYPES.includes(type)) {
    return { error: "Tipo de negocio inválido." };
  }
  if (registroComerciante.replace(/[^0-9A-Za-z]/g, "").length < 6) {
    return { error: "El Registro de Comerciante no parece válido (mínimo 6 caracteres)." };
  }
  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres." };
  }
  if (await getBusinessByEmail(email)) {
    return { error: "Ya existe una cuenta con ese email. Intenta acceder." };
  }

  // M-9: la verificación de existencia es una primera barrera; el constraint
  // UNIQUE (lo añade el Agente B) es la garantía real contra carreras. Si dos
  // registros del mismo correo llegan a la vez, atrapamos la violación y
  // devolvemos un mensaje claro en vez de un 500.
  let business;
  try {
    business = await createBusiness({
      businessName,
      type,
      contactName,
      email,
      phone,
      municipio,
      registroComerciante,
      passwordHash: hashPassword(password),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message.toLowerCase() : "";
    if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("23505")) {
      return { error: "Ese correo ya está registrado. Intenta acceder." };
    }
    return { error: "No se pudo crear la cuenta. Intenta de nuevo." };
  }

  await setSession(business.id);
  redirect("/negocios/cuenta?bienvenida=1");
}

// --- B2B login -------------------------------------------------
export async function loginBusinessAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  const business = await getBusinessByEmail(email);
  if (!business || !verifyPassword(password, business.passwordHash)) {
    return { error: "Email o contraseña incorrectos." };
  }

  await setSession(business.id);
  redirect("/negocios/cuenta");
}

export async function logoutBusinessAction(): Promise<void> {
  await clearSession();
  redirect("/");
}

// --- Admin -----------------------------------------------------
export async function adminLoginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // A-1: rate-limit por IP para frenar fuerza bruta sobre el password de admin.
  const h = await headers();
  const ip =
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "desconocido";
  const limited = rateLimit(`admin-login:${ip}`, 5, 60_000);
  if (!limited.ok) {
    const secs = Math.ceil(limited.retryAfterMs / 1000);
    return { error: `Demasiados intentos. Espera ${secs}s e intenta de nuevo.` };
  }

  const password = String(formData.get("password") || "");
  if (!checkAdminPassword(password)) {
    return { error: "Contraseña de admin incorrecta." };
  }
  await setAdminSession();
  redirect("/admin");
}

export async function adminLogoutAction(): Promise<void> {
  await clearAdminSession();
  redirect("/admin");
}

export async function approveBusinessAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const bid = String(formData.get("bid") || "");
  const business = await setBusinessStatus(bid, "verified");
  if (business) await notifyBusinessApproved(business).catch(() => {});
  revalidatePath("/admin");
}

export async function rejectBusinessAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const bid = String(formData.get("bid") || "");
  await setBusinessStatus(bid, "rejected");
  revalidatePath("/admin");
}

// --- Carrito: repricing server-side para mostrar (CR-1) --------
/**
 * Recalcula el carrito server-side para que el cliente MUESTRE precios reales
 * (retail con descuento, o mayorista si la sesión es un negocio verificado) sin
 * confiar en nada del navegador. Es solo lectura (no muta). Devuelve las líneas
 * con datos de presentación + totales; si algo no cuadra, `error` + las líneas
 * que sí se pudieron resolver.
 */
export type PricedCartState = {
  kind: "b2c" | "b2b";
  wholesale: boolean;
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  total: number;
  /** Mínimo de pedido mayorista en USD (0 para B2C). */
  minOrder: number;
  /** True si es pedido mayorista y aún no alcanza el mínimo. */
  belowMin: boolean;
  notice?: string;
};

export async function priceCartAction(
  intent: CartIntentLine[],
): Promise<PricedCartState> {
  const priced = await priceCartForDisplay(parseIntentLines(intent));
  return {
    kind: priced.kind,
    wholesale: priced.wholesale,
    lines: priced.lines,
    subtotal: priced.subtotal,
    shipping: priced.shipping,
    total: priced.total,
    minOrder: priced.minOrder,
    belowMin: priced.belowMin,
    notice: priced.notice,
  };
}

// --- Checkout --------------------------------------------------
export async function checkoutAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const customerName = String(formData.get("customerName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!customerName || !email) return { error: "Falta tu nombre o email." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Email inválido." };

  // CR-1: el cliente solo manda intención [{productId, qty}]. Todo precio,
  // nombre, envío, kind y businessId se derivan server-side desde la DB + la
  // sesión. Ignoramos cualquier unitPrice/name/shipping/kind del FormData.
  let intentRaw: unknown = [];
  try {
    intentRaw = JSON.parse(String(formData.get("items") || "[]"));
  } catch {
    return { error: "Carrito inválido." };
  }
  const priced = await priceCart(parseIntentLines(intentRaw));
  if (isPricedError(priced)) return { error: priced.error };

  const { kind, businessId, items, shipping, total } = priced;

  // Cash-first: B2B paga AHORA igual que B2C (tarjeta vía Stripe, o ATH Móvil
  // por su propia ruta). Ya no se emite factura/crédito automático — el crédito
  // se gana después con historial de compra (ver ESTRATEGIA-B2B.md, Fase 4).
  // El pedido conserva `kind`/`businessId` para reportería B2B. El mínimo de
  // pedido mayorista ya lo validó priceCart (rechaza si subtotal < mínimo).

  // --- Stripe: cobro real con tarjeta. El inventario NO se descuenta
  // aquí; se descuenta cuando el webhook de Stripe confirma `paid` (CR-3/A-8). ---
  if (stripeEnabled()) {
    const order = await createOrder({
      kind,
      businessId,
      customerName,
      email,
      items,
      shipping,
      total,
      paymentStatus: "pendiente_pago",
      paymentMethod: "stripe",
    });

    const h = await headers();
    const host = h.get("host") || "localhost:3000";
    const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;

    let url: string | null = null;
    try {
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        line_items: items.map((it) => ({
          price_data: {
            currency: "usd",
            product_data: { name: it.name },
            unit_amount: toCents(it.unitPrice),
          },
          quantity: it.qty,
        })),
        shipping_options:
          shipping > 0
            ? [
                {
                  shipping_rate_data: {
                    type: "fixed_amount",
                    fixed_amount: { amount: toCents(shipping), currency: "usd" },
                    display_name: "Envío",
                  },
                },
              ]
            : undefined,
        metadata: { orderId: order.id },
        success_url: `${origin}/carrito/gracias?o=${order.id}`,
        cancel_url: `${origin}/carrito`,
      });
      await updateOrder(order.id, { stripeSessionId: session.id });
      url = session.url;
    } catch {
      return { error: "No se pudo iniciar el pago. Intenta de nuevo." };
    }
    if (!url) return { error: "No se pudo iniciar el pago." };
    redirect(url);
  }

  // --- Fallback sin Stripe (demo): registra la orden y muestra confirmación.
  // Sin pasarela real no hay confirmación de pago, así que descontamos aquí. ---
  const order = await createOrder({ kind, businessId, customerName, email, items, shipping, total });
  await applyOrderInventory(order).catch(() => {});
  await notifyOrderConfirmation(order).catch(() => {});
  redirect(`/carrito/gracias?o=${order.id}`);
}

// --- AI: generador de copy (admin) -----------------------------
export async function generateCopyAction(
  _prev: CopyState,
  formData: FormData,
): Promise<CopyState> {
  if (!(await isAdmin())) return { error: "No autorizado." };
  const name = String(formData.get("name") || "").trim();
  const category = String(formData.get("category") || "General").trim();
  const audience = String(formData.get("audience") || "clientes en Puerto Rico").trim();
  if (!name) return { error: "Escribe el nombre del producto." };
  try {
    const result = await generateMarketingCopy({ name, category, audience });
    return { result };
  } catch {
    return { error: "No se pudo generar el copy. Intenta de nuevo." };
  }
}

// --- Gestión de productos (admin) ------------------------------
function parseProductForm(fd: FormData): {
  value?: Omit<Product, "id" | "slug"> & { slug?: string };
  error?: string;
} {
  const name = String(fd.get("name") || "").trim();
  if (!name) return { error: "El nombre es obligatorio." };

  const num = (k: string, d = 0) => {
    const n = Number(fd.get(k));
    return Number.isFinite(n) ? n : d;
  };

  const retail = num("retail");
  const wholesale = num("wholesale");
  if (retail <= 0) return { error: "El precio al detal debe ser mayor que 0." };
  if (wholesale < 0) return { error: "El precio mayorista no puede ser negativo." };

  const badges = (fd.getAll("badges") as string[]).filter(Boolean) as Badge[];
  const segments = (fd.getAll("segments") as string[]).filter(Boolean) as Segment[];
  const grupoIds = (fd.getAll("grupoIds") as string[]).filter(Boolean);
  const tags = String(fd.get("tags") || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  // Galería de fotos: viene como JSON en un campo oculto. La primera es la
  // portada. A-3: cada URL pasa por safeImageUrl (descarta esquemas peligrosos
  // y hosts no permitidos); las inválidas se descartan en silencio.
  let imageUrls: string[] = [];
  try {
    const parsed = JSON.parse(String(fd.get("imageUrls") || "[]"));
    if (Array.isArray(parsed)) {
      imageUrls = parsed
        .map((u) => safeImageUrl(u))
        .filter((u): u is string => typeof u === "string");
    }
  } catch {
    imageUrls = [];
  }
  const coverRaw = safeImageUrl(fd.get("imageUrl"));
  const cover = imageUrls[0] || coverRaw || undefined;
  if (cover && !imageUrls.includes(cover)) imageUrls = [cover, ...imageUrls];

  // A-3: sourceUrl (enlace al proveedor) se valida con safeUrl; inválida → "".
  const sourceUrl = safeUrl(fd.get("sourceUrl")) || "";

  const value: Omit<Product, "id" | "slug"> & { slug?: string } = {
    name,
    slug: String(fd.get("slug") || "").trim() || undefined,
    emoji: String(fd.get("emoji") || "📦").trim() || "📦",
    gradient: String(fd.get("gradient") || "linear-gradient(135deg,#ff5a36,#ffc53d)"),
    imageUrl: cover,
    imageUrls,
    category: String(fd.get("category") || "General").trim() || "General",
    grupoIds,
    tagline: String(fd.get("tagline") || "").trim(),
    description: String(fd.get("description") || "").trim(),
    retail,
    wholesale,
    moq: Math.max(1, Math.round(num("moq", 1))),
    unitsPerCase: Math.max(1, Math.round(num("unitsPerCase", 1))),
    badges,
    tags,
    segments,
    landedCost: Math.max(0, num("landedCost")),
    sourceUrl,
    stock: Math.max(0, Math.round(num("stock"))),
    discountPercent: Math.min(90, Math.max(0, num("discountPercent"))),
    shippingPrice: Math.max(0, num("shippingPrice")),
    active: fd.get("active") !== null,
  };
  return { value };
}

export async function createProductAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (!(await isAdmin())) return { error: "No autorizado." };
  const { value, error } = parseProductForm(fd);
  if (error || !value) return { error: error || "Datos inválidos." };
  await createProduct(value);
  redirect("/admin/productos?ok=creado");
}

export async function updateProductAction(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (!(await isAdmin())) return { error: "No autorizado." };
  const pid = String(fd.get("id") || "");
  if (!pid) return { error: "Falta el id del producto." };
  const { value, error } = parseProductForm(fd);
  if (error || !value) return { error: error || "Datos inválidos." };
  if (!(await updateProduct(pid, value))) return { error: "Producto no encontrado." };
  redirect("/admin/productos?ok=guardado");
}

export async function deleteProductAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const pid = String(fd.get("id") || "");
  if (pid) await deleteProduct(pid);
  revalidatePath("/admin/productos");
  redirect("/admin/productos?ok=eliminado");
}

export async function toggleProductActiveAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const pid = String(fd.get("id") || "");
  const current = await getProductById(pid);
  if (current) await updateProduct(pid, { active: current.active === false });
  revalidatePath("/admin/productos");
}

// --- Grupos: curaduría de catálogo (admin) ---------------------
export async function createGrupoAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const name = String(fd.get("name") || "").trim();
  if (!name) return;
  await createGrupo({
    name,
    emoji: String(fd.get("emoji") || "🗂️").trim() || "🗂️",
    description: String(fd.get("description") || "").trim() || undefined,
    color: String(fd.get("color") || "").trim() || undefined,
  });
  revalidatePath("/admin/grupos");
  revalidatePath("/admin");
}

export async function updateGrupoAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const gid = String(fd.get("gid") || "");
  const name = String(fd.get("name") || "").trim();
  if (!gid || !name) return;
  await updateGrupo(gid, {
    name,
    emoji: String(fd.get("emoji") || "🗂️").trim() || "🗂️",
    description: String(fd.get("description") || "").trim() || undefined,
    color: String(fd.get("color") || "").trim() || undefined,
  });
  revalidatePath("/admin/grupos");
  revalidatePath("/admin/productos");
}

export async function deleteGrupoAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const gid = String(fd.get("gid") || "");
  if (!gid) return;
  // Limpia la referencia al grupo en todos los productos que lo tenían.
  const products = await listProducts();
  for (const p of products) {
    if ((p.grupoIds ?? []).includes(gid)) {
      await updateProduct(p.id, { grupoIds: (p.grupoIds ?? []).filter((g) => g !== gid) });
    }
  }
  await deleteGrupo(gid);
  revalidatePath("/admin/grupos");
  revalidatePath("/admin/productos");
  revalidatePath("/admin");
}

/** Asigna el conjunto de productos de un grupo de una sola vez ("poner productos por grupos"). */
export async function setGrupoProductsAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const gid = String(fd.get("gid") || "");
  if (!gid) return;
  const selected = new Set((fd.getAll("pids") as string[]).filter(Boolean));
  const products = await listProducts();
  for (const p of products) {
    const current = p.grupoIds ?? [];
    const has = current.includes(gid);
    const want = selected.has(p.id);
    if (has === want) continue;
    const next = want ? [...current, gid] : current.filter((g) => g !== gid);
    await updateProduct(p.id, { grupoIds: next });
  }
  revalidatePath("/admin/grupos");
  revalidatePath("/admin/productos");
}

// --- AI: autocompletar producto (admin) ------------------------
export type ProductDraftState = { draft?: ProductDraft; error?: string };

export async function aiProductDraftAction(input: {
  name: string;
  landedCost?: number;
  category?: string;
  sourceUrl?: string;
}): Promise<ProductDraftState> {
  if (!(await isAdmin())) return { error: "No autorizado." };
  const name = (input.name || "").trim();
  if (!name) return { error: "Escribe el nombre del producto primero." };
  try {
    const draft = await generateProductDraft({
      name,
      landedCost: input.landedCost,
      category: input.category?.trim() || undefined,
      sourceUrl: input.sourceUrl?.trim() || undefined,
    });
    return { draft };
  } catch {
    return { error: "No se pudo autocompletar. Intenta de nuevo." };
  }
}

// --- AI: copiloto de verificación B2B (admin) ------------------
export type AssessState = { assessment?: BusinessAssessment; error?: string };

export async function assessBusinessAction(
  _prev: AssessState,
  fd: FormData,
): Promise<AssessState> {
  if (!(await isAdmin())) return { error: "No autorizado." };
  const bid = String(fd.get("bid") || "");
  const b = await getBusinessById(bid);
  if (!b) return { error: "Negocio no encontrado." };
  try {
    const assessment = await assessBusiness(b);
    return { assessment };
  } catch {
    return { error: "No se pudo analizar el negocio." };
  }
}

// --- Sourcing: pipeline (admin) --------------------------------
export async function discoverCandidatesAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const brief = String(fd.get("brief") || "").trim();
  const { candidates } = await brainstormCandidates({ brief, count: 4 });
  // Mismo camino que Hermes: deposita por el brain → abre gate por candidato + bitácora.
  if (candidates.length) {
    await ingestPayload(
      { candidates: candidates.map((c) => ({ ...c, stage: "Detectado" as const, origin: "app" as const })) },
      { agent: "app" },
    );
  }
  revalidatePath("/admin");
  revalidatePath("/admin/aprobaciones");
}

export async function setCandidateStageAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const cid = String(fd.get("cid") || "");
  const stage = String(fd.get("stage") || "Detectado") as SourcingStage;
  await updateCandidate(cid, { stage });
  revalidatePath("/admin");
}

export async function deleteCandidateAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const cid = String(fd.get("cid") || "");
  if (cid) await deleteCandidate(cid);
  revalidatePath("/admin");
}

/** Promueve un candidato a producto borrador (inactivo) y abre su edición. */
export async function promoteCandidateAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const cid = String(fd.get("cid") || "");
  const c = await getCandidateById(cid);
  if (!c) return;
  const draft = await generateProductDraft({
    name: c.name,
    landedCost: c.unitCost,
    category: c.category,
    sourceUrl: c.sourceUrl,
    hint: c.signal,
  });
  const product = await createProduct({
    name: c.name,
    emoji: c.emoji || draft.emoji,
    gradient: GRADIENT_PRESETS[0],
    imageUrl: c.imageUrl,
    imageUrls: c.imageUrl ? [c.imageUrl] : [],
    category: c.category || draft.category,
    tagline: draft.tagline,
    description: draft.description,
    retail: c.estRetail || draft.retail,
    wholesale: c.estWholesale ?? draft.wholesale,
    moq: c.moq ?? draft.moq,
    unitsPerCase: draft.unitsPerCase,
    badges: draft.badges,
    tags: draft.tags,
    segments: draft.segments,
    landedCost: c.unitCost,
    sourceUrl: c.sourceUrl ?? "",
    stock: 0,
    discountPercent: 0,
    shippingPrice: draft.shippingPrice,
    active: false, // borrador: requiere revisión humana antes de publicar
  });
  await updateCandidate(cid, { stage: "Ordenado", productId: product.id });
  redirect(`/admin/productos/${product.id}?ok=promovido`);
}

// --- Suplidores (admin) ----------------------------------------
export async function createSupplierAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const name = String(fd.get("name") || "").trim();
  if (!name) return;
  await createSupplier({
    name,
    platform: String(fd.get("platform") || "Alibaba").trim() || "Alibaba",
    url: String(fd.get("url") || "").trim() || undefined,
    email: String(fd.get("email") || "").trim() || undefined,
    whatsapp: String(fd.get("whatsapp") || "").trim() || undefined,
    country: String(fd.get("country") || "").trim() || undefined,
    products: String(fd.get("products") || "").trim() || undefined,
    notes: String(fd.get("notes") || "").trim() || undefined,
  });
  revalidatePath("/admin");
}

export async function setSupplierStatusAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const sid = String(fd.get("sid") || "");
  const status = String(fd.get("status") || "nuevo") as SupplierStatus;
  await updateSupplier(sid, { status });
  revalidatePath("/admin");
}

export async function deleteSupplierAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const sid = String(fd.get("sid") || "");
  if (sid) await deleteSupplier(sid);
  revalidatePath("/admin");
}

/** Redacta (AI) y guarda el primer mensaje de outreach al suplidor. */
export async function draftOutreachAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const sid = String(fd.get("sid") || "");
  const s = await getSupplierById(sid);
  if (!s) return;
  const channel = s.email ? "email" : "whatsapp";
  const draft = await draftSupplierOutreach({
    supplierName: s.name,
    platform: s.platform,
    channel,
  });
  await updateSupplier(sid, {
    outreachDraft: `${draft.subject}\n\n${draft.body}`,
    lastContactedAt: new Date().toISOString(),
  });
  // Gate: el envío real lo hace Hermes SOLO cuando Miguel aprueba esta tarea.
  await createTask({
    kind: "outreach",
    title: `Enviar outreach: ${s.name}`,
    summary: `Mensaje redactado (${draft.source}). Aprobar para que Hermes lo envíe en ${s.platform}.`,
    createdBy: "app",
    payload: { supplierId: s.id, subject: draft.subject, body: draft.body, channel },
    relatedType: "supplier",
    relatedId: s.id,
  });
  await logRun({ agent: "app", action: "outreach", summary: `Outreach redactado para ${s.name}`, meta: { supplierId: s.id } });
  revalidatePath("/admin");
  revalidatePath("/admin/aprobaciones");
}

// --- Cerebro de control: aprobaciones (admin) ------------------
export async function approveTaskAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const tid = String(fd.get("tid") || "");
  const note = String(fd.get("note") || "").trim() || undefined;
  // M-1: compare-and-set para evitar doble dispatch. Re-leemos el estado justo
  // antes de transicionar y volvemos a verificar tras la escritura: solo
  // despachamos el efecto si esta corrida fue la que cruzó pendiente→aprobada.
  const task = await getApprovalTaskById(tid);
  if (!task || task.status !== "pendiente") return;
  const updated = await updateApprovalTask(tid, {
    status: "aprobada",
    decidedAt: new Date().toISOString(),
    decisionNote: note,
  });
  // Re-confirmar que seguimos en una transición consistente (no ejecutada ya).
  const confirmed = await getApprovalTaskById(tid);
  if (updated && confirmed && confirmed.status === "aprobada" && !confirmed.executedAt) {
    const res = await dispatchApproval(updated);
    await logRun({
      agent: "app",
      action: `aprobar:${updated.kind}`,
      status: res.ok ? "ok" : "error",
      summary: `${updated.title} — ${res.message}`,
      meta: { taskId: tid },
    });
  }
  revalidatePath("/admin/aprobaciones");
  revalidatePath("/admin");
}

export async function rejectTaskAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const tid = String(fd.get("tid") || "");
  const note = String(fd.get("note") || "").trim() || undefined;
  const task = await getApprovalTaskById(tid);
  if (!task || task.status !== "pendiente") return;
  await updateApprovalTask(tid, {
    status: "rechazada",
    decidedAt: new Date().toISOString(),
    decisionNote: note,
  });
  await logRun({ agent: "app", action: `rechazar:${task.kind}`, summary: task.title, meta: { taskId: tid } });
  revalidatePath("/admin/aprobaciones");
  revalidatePath("/admin");
}

// --- Loop de compra: órdenes de compra (admin) -----------------
/** Redacta una orden de compra desde un candidato y abre su gate de aprobación. */
export async function draftPOFromCandidateAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const cid = String(fd.get("cid") || "");
  const qty = Math.max(1, Math.round(Number(fd.get("qty")) || 0));
  const c = await getCandidateById(cid);
  if (!c) return;
  await draftPurchaseOrder({
    supplierId: c.supplierId,
    supplierName: c.supplier || "Suplidor por definir",
    candidateId: c.id,
    productId: c.productId,
    productName: c.name,
    qty: qty || c.moq || 100,
    unitCost: c.unitCost,
    createdBy: "app",
    notes: c.signal,
  });
  if (c.stage === "Detectado" || c.stage === "Evaluando") {
    await updateCandidate(c.id, { stage: "Negociando" });
  }
  revalidatePath("/admin/compras");
  revalidatePath("/admin/aprobaciones");
  revalidatePath("/admin");
}

export async function setPurchaseOrderStatusAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const poId = String(fd.get("poId") || "");
  const status = String(fd.get("status") || "borrador") as PurchaseOrderStatus;
  // Recibir sube el inventario del producto enlazado (saldo = suma de movimientos).
  // M-1: no re-recibir una OC ya recibida (evita doble entrada de inventario).
  if (status === "recibida") {
    const existing = await getPurchaseOrderById(poId);
    if (existing && existing.status === "recibida") {
      revalidatePath("/admin/compras");
      return;
    }
    await receivePurchaseOrder(poId, "app");
  } else {
    await updatePurchaseOrder(poId, { status });
    await logRun({ agent: "app", action: "po:status", summary: `OC ${poId} → ${status}`, meta: { purchaseOrderId: poId, status } });
  }
  revalidatePath("/admin/compras");
  revalidatePath("/admin/productos");
}

export async function deletePurchaseOrderAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const poId = String(fd.get("poId") || "");
  if (poId) await deletePurchaseOrder(poId);
  revalidatePath("/admin/compras");
}

// --- Loop físico: embarques (admin) ----------------------------
export async function createShipmentFromPOAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const poId = String(fd.get("poId") || "");
  const po = await getPurchaseOrderById(poId);
  if (!po) return;
  await createShipment({
    purchaseOrderId: po.id,
    productName: po.productName,
    carrier: String(fd.get("carrier") || "").trim() || undefined,
    tracking: String(fd.get("tracking") || "").trim() || undefined,
    createdBy: "app",
  });
  if (po.status === "enviada" || po.status === "confirmada" || po.status === "pagada" || po.status === "produccion") {
    await updatePurchaseOrder(po.id, { status: "embarcada" });
  }
  await logRun({ agent: "app", action: "shipment:new", summary: `Embarque para ${po.productName}`, meta: { purchaseOrderId: po.id } });
  revalidatePath("/admin/compras");
}

export async function setShipmentStatusAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const sid = String(fd.get("sid") || "");
  const status = String(fd.get("status") || "preparando") as ShipmentStatus;
  await updateShipment(sid, { status, updatedAt: new Date().toISOString() });
  revalidatePath("/admin/compras");
}

export async function deleteShipmentAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const sid = String(fd.get("sid") || "");
  if (sid) await deleteShipment(sid);
  revalidatePath("/admin/compras");
}

// --- Promociones: campañas (admin) -----------------------------
export async function createCampaignAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const name = String(fd.get("name") || "").trim();
  if (!name) return;
  const discountPercent = Math.min(90, Math.max(0, Number(fd.get("discountPercent")) || 0));
  const productIds = (fd.getAll("pids") as string[]).filter(Boolean);
  const segment = (String(fd.get("segment") || "todos").trim() || "todos") as Segment | "todos";
  const endsAt = String(fd.get("endsAt") || "").trim() || undefined;
  if (productIds.length === 0 || discountPercent <= 0) return;

  // Copy de marketing best-effort (cae a plantilla sin key de AI).
  let copy: string | undefined;
  try {
    const c = await generateMarketingCopy({
      name,
      category: "promoción",
      audience: segment === "todos" ? "clientes en Puerto Rico" : segment,
    });
    copy = `${c.headline}\n${c.caption}`;
  } catch {
    copy = undefined;
  }

  const campaign = await createCampaign({
    name,
    productIds,
    segment,
    discountPercent,
    endsAt,
    copy,
    createdBy: "app",
  });
  // Gate de publicación: aprobar antes de activar el descuento en la tienda.
  await createTask({
    kind: "promocion",
    title: `Aprobar promoción: ${name} (${discountPercent}% off)`,
    summary: `${productIds.length} productos · segmento ${segment}. Aprobar para activar el descuento en la tienda.`,
    createdBy: "app",
    relatedType: "campaign",
    relatedId: campaign.id,
    payload: { campaignId: campaign.id },
  });
  await logRun({ agent: "app", action: "campaign:new", summary: `Campaña "${name}" (${discountPercent}%)`, meta: { campaignId: campaign.id } });
  revalidatePath("/admin/promociones");
  revalidatePath("/admin/aprobaciones");
}

export async function finalizeCampaignAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const cid = String(fd.get("cid") || "");
  const camp = await getCampaignById(cid);
  if (!camp) return;
  await updateCampaign(cid, { status: "finalizada" });
  // Quita el descuento de los productos de la campaña.
  for (const pid of camp.productIds) await updateProduct(pid, { discountPercent: 0 });
  await logRun({ agent: "app", action: "campaign:finalize", summary: `Campaña "${camp.name}" finalizada`, meta: { campaignId: cid } });
  revalidatePath("/admin/promociones");
  revalidatePath("/admin/productos");
}

export async function deleteCampaignAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const cid = String(fd.get("cid") || "");
  const camp = await getCampaignById(cid);
  if (camp && camp.status === "activa") {
    for (const pid of camp.productIds) await updateProduct(pid, { discountPercent: 0 });
  }
  if (cid) await deleteCampaign(cid);
  revalidatePath("/admin/promociones");
  revalidatePath("/admin/productos");
}

// --- Consola del operador (Hermes/computer use, o pegado manual, cookie-authed) -----
/**
 * Hermes (o Miguel) deposita aquí los hallazgos en JSON
 * { candidates, suppliers, quotes } y caen al brain vía el mismo ingestPayload
 * que el webhook — pero autorizado por la cookie de admin, sin token.
 */
export async function operatorIngestAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) {
    redirect("/admin/operador?err=auth");
  }
  const raw = String(fd.get("payload") || "").trim();
  if (!raw) redirect("/admin/operador?err=vacio");

  let body: { candidates?: unknown; suppliers?: unknown; quotes?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    redirect("/admin/operador?err=json");
    return;
  }
  const candidates = Array.isArray(body.candidates) ? (body.candidates as CandidateInput[]) : [];
  const suppliers = Array.isArray(body.suppliers) ? (body.suppliers as SupplierInput[]) : [];
  const quotes = Array.isArray(body.quotes) ? (body.quotes as QuoteInput[]) : [];
  if (candidates.length + suppliers.length + quotes.length === 0) {
    redirect("/admin/operador?err=nada");
  }
  // Cada candidato/suplidor necesita un name (lo demás toma defaults).
  if (candidates.some((c) => !c?.name?.trim?.()) || suppliers.some((s) => !s?.name?.trim?.())) {
    redirect("/admin/operador?err=name");
  }

  const result = await ingestPayload({ candidates, suppliers, quotes }, { agent: "hermes" });
  revalidatePath("/admin/operador");
  revalidatePath("/admin/aprobaciones");
  revalidatePath("/admin");
  redirect(
    `/admin/operador?ok=${result.candidates.length}-${result.suppliers.length}-${result.quotes.length}`,
  );
}

/**
 * Hermes (o Miguel) reporta que ejecutó una tarea de la cola (ej. envió el outreach
 * en Alibaba). La saca de la cola del brief (executedAt) y deja rastro.
 */
export async function markQueueDoneAction(fd: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const tid = String(fd.get("tid") || "");
  const note = String(fd.get("note") || "").trim() || undefined;
  const task = await getApprovalTaskById(tid);
  if (!task || task.status !== "aprobada" || task.executedAt) return;
  await updateApprovalTask(tid, { executedAt: new Date().toISOString() });
  await logRun({
    agent: "hermes",
    action: "queue:done",
    summary: `Ejecutada: ${task.title}`,
    meta: { taskId: tid, note },
  });
  revalidatePath("/admin/operador");
  revalidatePath("/admin/bitacora");
}
