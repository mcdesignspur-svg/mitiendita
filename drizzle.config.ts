import { defineConfig } from "drizzle-kit";

// Carga .env para los comandos de drizzle-kit (push/generate/migrate/studio).
try {
  process.loadEnvFile(".env");
} catch {
  /* .env opcional */
}

export default defineConfig({
  schema: "./lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Para DDL (crear tablas) preferimos la conexión directa/unpooled de Neon.
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
});
