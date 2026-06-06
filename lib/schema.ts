import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  serial,
} from "drizzle-orm/pg-core";
import type { Badge, Segment, OrderItem } from "./types";

export const products = pgTable("products", {
  id: text("id").primaryKey(),
  seq: serial("seq"),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("📦"),
  gradient: text("gradient").notNull().default(""),
  category: text("category").notNull().default("General"),
  collection: text("collection").default("General"),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  retail: doublePrecision("retail").notNull().default(0),
  wholesale: doublePrecision("wholesale").notNull().default(0),
  moq: integer("moq").notNull().default(1),
  unitsPerCase: integer("units_per_case").notNull().default(1),
  badges: jsonb("badges").$type<Badge[]>().notNull().default([]),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  segments: jsonb("segments").$type<Segment[]>().notNull().default([]),
  landedCost: doublePrecision("landed_cost").notNull().default(0),
  sourceUrl: text("source_url").notNull().default(""),
  stock: integer("stock").notNull().default(0),
  discountPercent: doublePrecision("discount_percent").notNull().default(0),
  shippingPrice: doublePrecision("shipping_price").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const businesses = pgTable("businesses", {
  id: text("id").primaryKey(),
  businessName: text("business_name").notNull(),
  type: text("type").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  municipio: text("municipio").notNull().default(""),
  registroComerciante: text("registro_comerciante").notNull().default(""),
  status: text("status").notNull().default("pending"),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
  notes: text("notes"),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull().default("b2c"),
  businessId: text("business_id"),
  customerName: text("customer_name").notNull(),
  email: text("email").notNull(),
  items: jsonb("items").$type<OrderItem[]>().notNull().default([]),
  shipping: doublePrecision("shipping").notNull().default(0),
  total: doublePrecision("total").notNull().default(0),
  status: text("status").notNull().default("nuevo"),
  createdAt: text("created_at").notNull(),
});
