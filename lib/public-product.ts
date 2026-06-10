/**
 * DTO público de producto. NUNCA incluye landedCost, sourceUrl ni grupoIds.
 * wholesale/moq solo se incluyen cuando el negocio está verificado.
 */
import type { Product, Badge, Segment } from "./types";

export interface PublicProduct {
  id: string;
  slug: string;
  name: string;
  emoji: string;
  gradient: string;
  imageUrl?: string;
  imageUrls?: string[];
  category: string;
  tagline: string;
  description: string;
  tags: string[];
  badges: Badge[];
  segments: Segment[];
  retail: number;
  discountPercent?: number;
  shippingPrice?: number;
  stock: number;
  active?: boolean;
  unitsPerCase: number;
  /** Solo presente cuando el negocio está verificado (B2B). */
  wholesale?: number;
  /** Solo presente cuando el negocio está verificado (B2B). */
  moq?: number;
}

export function toPublicProduct(p: Product, verified: boolean): PublicProduct {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    emoji: p.emoji,
    gradient: p.gradient,
    imageUrl: p.imageUrl,
    imageUrls: p.imageUrls,
    category: p.category,
    tagline: p.tagline,
    description: p.description,
    tags: p.tags,
    badges: p.badges,
    segments: p.segments,
    retail: p.retail,
    discountPercent: p.discountPercent,
    shippingPrice: p.shippingPrice,
    stock: p.stock,
    active: p.active,
    unitsPerCase: p.unitsPerCase,
    ...(verified ? { wholesale: p.wholesale, moq: p.moq } : {}),
  };
}

/** Precio al detal efectivo (aplica descuento si hay). Seguro para cliente. */
export function effectiveRetailPublic(p: PublicProduct): number {
  const d = p.discountPercent ?? 0;
  if (d <= 0) return p.retail;
  return Math.round(p.retail * (1 - d / 100) * 100) / 100;
}

/** Devuelve true si el producto tiene un descuento activo. */
export function hasDiscountPublic(p: PublicProduct): boolean {
  return (p.discountPercent ?? 0) > 0;
}
