/**
 * Carga .env como EFECTO de importación.
 *
 * Debe importarse ANTES que `./db` en cualquier script standalone (tsx), porque
 * `lib/db` decide file-store vs Postgres en el momento en que se evalúa el
 * módulo (`const impl = process.env.DATABASE_URL ? pg : file`). Si el .env se
 * carga después del import, el script queda pegado al file-store local aunque
 * DATABASE_URL exista. La app Next.js no necesita esto (ya carga .env sola).
 *
 * Uso:  import "./load-env";  // <- primera línea de imports del script
 */
try {
  process.loadEnvFile(".env");
} catch {
  /* .env es opcional: sin él se usa el file-store */
}
