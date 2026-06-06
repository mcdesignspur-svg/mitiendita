/**
 * Puente operador — la consola por donde Claude (o un agente programado) escribe
 * su investigación en el sistema. Lee y escribe de la MISMA capa de datos que la
 * página (lib/db), así que todo lo que ingiera aquí aparece en /admin al instante.
 *
 * Uso (vía tsx):
 *   npm run operator -- report
 *   npm run operator -- ingest research.json
 *   npm run operator -- outreach <supplierId> "Proyector LED Astronauta"
 *   npm run operator -- alibaba "usb car charger"   (requiere ALIBABA_APP_KEY/SECRET)
 *
 * Sin DATABASE_URL escribe al file-store (.data/db.json); con DATABASE_URL, a
 * Neon. El playbook de operación (cómo investigar y contactar) vive en OPERATOR.md.
 */
import "./load-env"; // DEBE ir primero: carga .env antes de evaluar lib/db.
import fs from "node:fs";
import { listCandidates, listSuppliers, getSupplierById, updateSupplier } from "./db";
import { scoreFor } from "./sourcing";
import { draftSupplierOutreach } from "./ai";
import { alibabaEnabled, searchProducts } from "./alibaba";
import { ingestPayload, type CandidateInput, type SupplierInput } from "./ingest";
import type { SourcingCandidate } from "./types";

async function ingest(file: string) {
  if (!file || !fs.existsSync(file)) {
    console.error(`❌ No encuentro el archivo: ${file}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
    candidates?: CandidateInput[];
    suppliers?: SupplierInput[];
  };

  const result = await ingestPayload(data);
  for (const s of result.suppliers) console.log(`  + suplidor: ${s.name} (${s.platform})`);
  for (const c of result.candidates) console.log(`  + candidato: ${c.emoji} ${c.name} (score ${c.score})`);
  console.log(
    `\n✅ Ingerido: ${result.candidates.length} candidatos, ${result.suppliers.length} suplidores. Visibles ya en /admin.`,
  );
}

async function report() {
  const candidates = await listCandidates();
  const suppliers = await listSuppliers();

  console.log(`\n📦 PIPELINE DE SOURCING — ${candidates.length} candidatos`);
  const byStage: Record<string, SourcingCandidate[]> = {};
  for (const c of candidates) (byStage[c.stage] ??= []).push(c);
  for (const [stage, list] of Object.entries(byStage)) {
    console.log(`\n  ${stage} (${list.length}):`);
    for (const c of list.sort((a, b) => scoreFor(b) - scoreFor(a))) {
      console.log(
        `    [${scoreFor(c)}] ${c.emoji} ${c.name} — ${c.supplier || "sin suplidor"} · costo $${c.unitCost} → retail $${c.estRetail}`,
      );
    }
  }

  console.log(`\n🏭 SUPLIDORES — ${suppliers.length}`);
  for (const s of suppliers) {
    console.log(`  · ${s.name} (${s.platform}) — ${s.status}${s.products ? ` · ${s.products}` : ""}`);
  }
  console.log("");
}

async function outreach(supplierId: string, productName?: string) {
  const s = await getSupplierById(supplierId);
  if (!s) {
    console.error(`❌ No existe el suplidor ${supplierId}`);
    process.exit(1);
  }
  const draft = await draftSupplierOutreach({
    supplierName: s.name,
    platform: s.platform,
    productName,
    channel: s.email ? "email" : "whatsapp",
  });
  await updateSupplier(s.id, {
    outreachDraft: `${draft.subject}\n\n${draft.body}`,
    status: s.status === "nuevo" ? "contactado" : s.status,
    lastContactedAt: new Date().toISOString(),
  });
  console.log(`\n✉️  Outreach para ${s.name} (${draft.source}):\n`);
  console.log(`Asunto: ${draft.subject}\n`);
  console.log(draft.body);
  console.log("");
}

async function searchAlibaba(query: string) {
  if (!query) {
    console.error('❌ Falta el término. Ej: npm run operator -- alibaba "usb car charger"');
    process.exit(1);
  }
  if (!alibabaEnabled()) {
    console.error(
      "❌ Falta ALIBABA_APP_KEY / ALIBABA_APP_SECRET en .env.\n" +
        "   Crea una app en la Alibaba.com Open Platform, pega las llaves y reintenta.",
    );
    process.exit(1);
  }
  console.log(`🔎 Buscando en Alibaba ICBU: "${query}"…\n`);
  const raw = await searchProducts(query);
  if (!raw) {
    console.error("❌ Sin respuesta de la API (revisa llaves, permisos y firma).");
    process.exit(1);
  }
  if (raw.code && raw.code !== "0") {
    console.error(`⚠️  La API respondió con error: code=${raw.code} ${raw.message ?? ""}\n`);
  }
  // Imprime el JSON crudo para ver el esquema real y afinar el mapeo a candidatos.
  console.log(JSON.stringify(raw, null, 2));
  console.log(
    "\nℹ️  Respuesta cruda. Con este esquema afino el mapeo a SourcingCandidate y en la próxima corrida ingiero directo (createCandidate) con el sourceUrl real.",
  );
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "ingest":
      await ingest(rest[0]);
      break;
    case "report":
      await report();
      break;
    case "outreach":
      await outreach(rest[0], rest[1]);
      break;
    case "alibaba":
      await searchAlibaba(rest.join(" ").trim());
      break;
    default:
      console.log(
        'Comandos:\n  report                      resumen del pipeline y suplidores\n  ingest <file.json>          añade candidatos y/o suplidores\n  outreach <supplierId> [prod] redacta y guarda el mensaje de contacto\n  alibaba "<búsqueda>"        busca productos reales en Alibaba ICBU (requiere llaves)',
      );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
