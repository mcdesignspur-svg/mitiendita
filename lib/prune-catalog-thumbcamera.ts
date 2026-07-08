/**
 * Elimina todos los productos de la base de datos excepto Thumbcamera.
 *
 * Conserva cualquier producto cuyo slug o nombre contenga "thumbcamera"
 * (case-insensitive). Aborta si no encuentra ninguno, para no vaciar el catálogo
 * por accidente.
 *
 * Uso (con DATABASE_URL en .env, o file-store local sin .env):
 *   npm run catalog:keep-thumbcamera
 */
import "./load-env";
import { listProducts, deleteProduct } from "./db";
import type { Product } from "./types";

function isThumbcamera(p: Pick<Product, "slug" | "name">): boolean {
  const slug = p.slug.toLowerCase();
  const name = p.name.toLowerCase();
  return slug === "thumbcamera" || slug.includes("thumbcamera") || name.includes("thumbcamera");
}

async function main() {
  const all = await listProducts();
  const keep = all.filter(isThumbcamera);
  const remove = all.filter((p) => !isThumbcamera(p));

  if (keep.length === 0) {
    console.error(
      "❌ No se encontró ningún producto Thumbcamera (slug o nombre).\n" +
        "   Crea el producto primero o revisa el criterio antes de volver a correr.",
    );
    process.exit(1);
  }

  if (keep.length > 1) {
    console.warn(`⚠️  Se conservarán ${keep.length} productos que coinciden con Thumbcamera:`);
    for (const p of keep) console.warn(`   · ${p.id} — ${p.name} (/${p.slug})`);
    console.warn("");
  }

  if (remove.length === 0) {
    console.log("✅ El catálogo ya solo tiene Thumbcamera. Nada que borrar.");
    process.exit(0);
  }

  console.log(`🧹 Borrando ${remove.length} producto(s). Se conserva(n) ${keep.length}:\n`);
  for (const p of keep) console.log(`   ✓ ${p.id} — ${p.name} (/${p.slug})`);
  console.log("");

  for (const p of remove) {
    const ok = await deleteProduct(p.id);
    console.log(`${ok ? "🗑" : "⚠️"}  ${p.id} — ${p.name} (/${p.slug})`);
  }

  console.log(`\n✅ Listo. Quedan ${keep.length} producto(s) en el catálogo.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error podando el catálogo:", err);
  process.exit(1);
});
