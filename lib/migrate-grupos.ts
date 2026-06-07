/**
 * Migración puntual: sincroniza el schema de grupos en Postgres/Neon sin usar
 * `drizzle-kit push` (interactivo). Idempotente. Ejecuta con `tsx`.
 *
 *   - crea la tabla `grupos`
 *   - añade `products.grupo_ids` (jsonb, NOT NULL DEFAULT '[]')
 *   - elimina la columna `products.collection` (reemplazada por grupos)
 *   - inserta los grupos semilla (ON CONFLICT DO NOTHING)
 */
import { neon } from "@neondatabase/serverless";
import { SEED_GRUPOS } from "./products";

async function main() {
  try {
    process.loadEnvFile(".env");
  } catch {
    /* .env opcional */
  }

  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ Falta DATABASE_URL en .env.");
    process.exit(1);
  }
  const sql = neon(url);

  console.log("→ Creando tabla grupos…");
  await sql`
    CREATE TABLE IF NOT EXISTS grupos (
      id text PRIMARY KEY,
      seq serial,
      slug text NOT NULL UNIQUE,
      name text NOT NULL,
      emoji text NOT NULL DEFAULT '🗂️',
      description text,
      color text,
      created_at text NOT NULL
    )
  `;

  console.log("→ Añadiendo products.grupo_ids…");
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS grupo_ids jsonb NOT NULL DEFAULT '[]'::jsonb`;

  console.log("→ Eliminando products.collection…");
  await sql`ALTER TABLE products DROP COLUMN IF EXISTS collection`;

  console.log("→ Sembrando grupos…");
  for (const g of SEED_GRUPOS) {
    await sql`
      INSERT INTO grupos (id, slug, name, emoji, description, color, created_at)
      VALUES (${g.id}, ${g.slug}, ${g.name}, ${g.emoji}, ${g.description ?? null}, ${g.color ?? null}, ${g.createdAt})
      ON CONFLICT (id) DO NOTHING
    `;
  }

  const gcount = await sql`SELECT count(*)::int AS n FROM grupos`;
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'products' AND column_name IN ('grupo_ids', 'collection')
  `;
  console.log(
    `✅ Migración OK. grupos=${gcount[0].n}, columnas products: ${cols.map((c) => c.column_name).join(", ") || "(ninguna de grupo_ids/collection)"}`,
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error en la migración:", err);
  process.exit(1);
});
