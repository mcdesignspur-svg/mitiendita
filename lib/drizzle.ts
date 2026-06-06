import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

/**
 * Cliente Drizzle sobre Neon (HTTP). Es perezoso: no se conecta hasta la
 * primera consulta, así el build/import no falla si falta DATABASE_URL.
 */
function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL no está configurado. Añádelo a .env para usar Postgres/Neon.",
    );
  }
  return drizzle(neon(url), { schema });
}

let _db: ReturnType<typeof createDb> | null = null;

export function getDb() {
  return (_db ??= createDb());
}
