/**
 * Suscribe la URL del webhook con ATH Móvil (one-time). Ejecuta:
 *   npm run ath:subscribe
 * Usa ATH_WEBHOOK_BASE si está definido, si no la URL de producción.
 */
import { subscribeAthWebhook } from "./athmovil";

async function main() {
  try {
    process.loadEnvFile(".env");
  } catch {
    /* ignore */
  }
  const base = process.env.ATH_WEBHOOK_BASE || "https://mitienditapr.net";
  const url = `${base}/api/ath/webhook`;
  console.log("Suscribiendo webhook ATH Móvil →", url);

  try {
    const r = await subscribeAthWebhook(url);
    console.log("status:", r.status);
    console.log("respuesta:", r.body);
    process.exit(r.status >= 200 && r.status < 300 ? 0 : 1);
  } catch (e) {
    console.error("❌", (e as Error).message);
    process.exit(1);
  }
}

main();
