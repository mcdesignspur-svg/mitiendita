"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { getStripe, stripeEnabled } from "./stripe";
import { athEnabled } from "./athmovil";
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
  createCandidate,
  getCandidateById,
  updateCandidate,
  deleteCandidate,
  createSupplier,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} from "./db";
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
  OrderItem,
  Product,
  Badge,
  Segment,
  SourcingStage,
  SupplierStatus,
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

  const business = await createBusiness({
    businessName,
    type,
    contactName,
    email,
    phone,
    municipio,
    registroComerciante,
    passwordHash: hashPassword(password),
  });

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

// --- Checkout --------------------------------------------------
export async function checkoutAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const customerName = String(formData.get("customerName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const kind = (String(formData.get("kind") || "b2c") === "b2b" ? "b2b" : "b2c") as
    | "b2c"
    | "b2b";
  const businessId = String(formData.get("businessId") || "") || undefined;

  let items: OrderItem[] = [];
  try {
    items = JSON.parse(String(formData.get("items") || "[]"));
  } catch {
    return { error: "Carrito inválido." };
  }

  if (!customerName || !email) return { error: "Falta tu nombre o email." };
  if (!items.length) return { error: "Tu carrito está vacío." };

  const shipping = Math.max(0, Number(formData.get("shipping")) || 0);
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const total = subtotal + shipping;

  // --- B2B: queda como factura (net 15/30), sin cobro con tarjeta ---
  if (kind === "b2b") {
    const order = await createOrder({
      kind,
      businessId,
      customerName,
      email,
      items,
      shipping,
      total,
      paymentStatus: "factura_pendiente",
      paymentMethod: "factura",
    });
    await notifyOrderConfirmation(order).catch(() => {});
    redirect(`/carrito/gracias?o=${order.id}`);
  }

  const method = String(formData.get("method") || "");

  // --- B2C con ATH Móvil: crea la orden y manda a la página del botón ---
  if (method === "ath" && athEnabled()) {
    const order = await createOrder({
      kind,
      businessId,
      customerName,
      email,
      items,
      shipping,
      total,
      paymentStatus: "pendiente_pago",
      paymentMethod: "ath_movil",
    });
    redirect(`/carrito/ath?o=${order.id}`);
  }

  // --- B2C con Stripe: cobro real con tarjeta ---
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
            unit_amount: Math.round(it.unitPrice * 100),
          },
          quantity: it.qty,
        })),
        shipping_options:
          shipping > 0
            ? [
                {
                  shipping_rate_data: {
                    type: "fixed_amount",
                    fixed_amount: { amount: Math.round(shipping * 100), currency: "usd" },
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

  // --- Fallback sin Stripe (demo): registra la orden y muestra confirmación ---
  const order = await createOrder({ kind, businessId, customerName, email, items, shipping, total });
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

  const value: Omit<Product, "id" | "slug"> & { slug?: string } = {
    name,
    slug: String(fd.get("slug") || "").trim() || undefined,
    emoji: String(fd.get("emoji") || "📦").trim() || "📦",
    gradient: String(fd.get("gradient") || "linear-gradient(135deg,#ff5a36,#ffc53d)"),
    imageUrl: String(fd.get("imageUrl") || "").trim() || undefined,
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
    sourceUrl: String(fd.get("sourceUrl") || "").trim(),
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
  for (const c of candidates) {
    await createCandidate({
      name: c.name,
      emoji: c.emoji || "📦",
      category: c.category || "General",
      supplier: c.supplier || "",
      unitCost: c.unitCost,
      estRetail: c.estRetail,
      estWholesale: c.estWholesale,
      moq: c.moq,
      trend: c.trend,
      shipping: c.shipping,
      stage: "Detectado",
      signal: c.signal,
      origin: "app",
    });
  }
  revalidatePath("/admin");
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
  const draft = await draftSupplierOutreach({
    supplierName: s.name,
    platform: s.platform,
    channel: s.email ? "email" : "whatsapp",
  });
  await updateSupplier(sid, {
    outreachDraft: `${draft.subject}\n\n${draft.body}`,
    status: s.status === "nuevo" ? "contactado" : s.status,
    lastContactedAt: new Date().toISOString(),
  });
  revalidatePath("/admin");
}
