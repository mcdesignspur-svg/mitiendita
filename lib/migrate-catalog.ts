/**
 * Migración puntual del catálogo en producción (Neon).
 *
 * Actualiza los 4 productos que cambiaron en el pivote "Salud & Farmacia" →
 * "Impulso & Conveniencia". Toma los datos canónicos de SEED_PRODUCTS
 * (lib/products.ts), así que se mantiene siempre en sync con el catálogo y no
 * duplica data. Imprime el antes→después de cada uno y es idempotente
 * (correrlo otra vez deja los mismos valores).
 *
 * Uso (con la connection string de Neon en .env):
 *   npm run migrate:catalog
 *
 * Requiere DATABASE_URL. Sin él aborta (no toca el file-store local).
 */
import { getProductById, updateProduct } from "./db";
import { SEED_PRODUCTS } from "./products";

// Los 4 ids que cambiaron de salud/belleza → conveniencia/impulso.
const IDS = ["p-006", "p-007", "p-008", "p-014"];

async function main() {
  try {
    process.loadEnvFile(".env");
  } catch {
    /* sin .env */
  }

  if (!process.env.DATABASE_URL) {
    console.error(
      "❌ Falta DATABASE_URL en .env. Esta migración es para la base de producción (Neon).\n" +
        "   Pega la connection string de Neon en .env y vuelve a correr `npm run migrate:catalog`.",
    );
    process.exit(1);
  }

  console.log("🔧 Migrando catálogo en Neon…\n");
  let updated = 0;

  for (const id of IDS) {
    const seed = SEED_PRODUCTS.find((p) => p.id === id);
    if (!seed) {
      console.warn(`⚠️  ${id}: no está en SEED_PRODUCTS; saltado.`);
      continue;
    }

    const current = await getProductById(id);
    if (!current) {
      console.warn(`⚠️  ${id}: no existe en la DB; saltado.`);
      continue;
    }

    // Si ya quedó migrado, lo decimos pero igual lo dejamos consistente.
    const already = current.slug === seed.slug && current.category === seed.category;

    const patch: Partial<typeof seed> = { ...seed };
    delete patch.id;

    const res = await updateProduct(id, patch);
    if (res) {
      console.log(
        `✓ ${id}: "${current.name}" (${current.category}) → "${res.name}" (${res.category}, /${res.slug})` +
          (already ? "  [ya estaba migrado]" : ""),
      );
      updated++;
    } else {
      console.warn(`⚠️  ${id}: no se pudo actualizar.`);
    }
  }

  console.log(`\n✅ Migración completa: ${updated}/${IDS.length} productos actualizados.`);
  console.log("   Revisa /admin/productos y la categoría 'Impulso & Conveniencia' en la tienda.");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Error en la migración:", e);
  process.exit(1);
});
