/**
 * Siembra la base de datos Postgres/Neon con los productos semilla y las
 * cuentas demo. Idempotente (onConflictDoNothing). Ejecuta: `npm run db:seed`.
 */
import { getDb } from "./drizzle";
import {
  products as productsTable,
  grupos as gruposTable,
  businesses as businessesTable,
  sourcingCandidates as candidatesTable,
  suppliers as suppliersTable,
} from "./schema";
import { SEED_PRODUCTS, SEED_GRUPOS } from "./products";
import { SEED_CANDIDATES, SEED_SUPPLIERS } from "./sourcing";
import { hashPassword } from "./crypto";
import type { Business } from "./types";

async function main() {
  try {
    process.loadEnvFile(".env");
  } catch {
    /* ignore */
  }

  if (!process.env.DATABASE_URL) {
    console.error("❌ Falta DATABASE_URL en .env. Agrégalo y vuelve a correr `npm run db:seed`.");
    process.exit(1);
  }

  const db = getDb();

  const demoBusinesses: Business[] = [
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
  ];

  await db.insert(businessesTable).values(demoBusinesses).onConflictDoNothing();
  await db.insert(gruposTable).values(SEED_GRUPOS).onConflictDoNothing();
  await db.insert(productsTable).values(SEED_PRODUCTS).onConflictDoNothing();
  await db.insert(suppliersTable).values(SEED_SUPPLIERS).onConflictDoNothing();
  await db.insert(candidatesTable).values(SEED_CANDIDATES).onConflictDoNothing();

  console.log(
    `✅ Seed completo: ${SEED_PRODUCTS.length} productos, ${SEED_GRUPOS.length} grupos, ${demoBusinesses.length} negocios demo, ${SEED_SUPPLIERS.length} suplidores y ${SEED_CANDIDATES.length} candidatos de sourcing.`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error sembrando la base de datos:", err);
  process.exit(1);
});
