"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createBusiness,
  createOrder,
  createProduct,
  deleteProduct,
  getBusinessByEmail,
  getProductById,
  setBusinessStatus,
  updateProduct,
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
import { generateMarketingCopy, type CopyResult } from "./ai";
import type { BusinessType, OrderItem, Product, Badge, Segment } from "./types";

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
  await setBusinessStatus(bid, "verified");
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
  const order = await createOrder({ kind, businessId, customerName, email, items, shipping, total });
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
  const tags = String(fd.get("tags") || "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const value: Omit<Product, "id" | "slug"> & { slug?: string } = {
    name,
    slug: String(fd.get("slug") || "").trim() || undefined,
    emoji: String(fd.get("emoji") || "📦").trim() || "📦",
    gradient: String(fd.get("gradient") || "linear-gradient(135deg,#ff5a36,#ffc53d)"),
    category: String(fd.get("category") || "General").trim() || "General",
    collection: String(fd.get("collection") || "").trim() || "General",
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
