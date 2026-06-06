/**
 * Puente operador — la consola por donde Claude (o un agente programado) escribe
 * su investigación en el sistema. Lee y escribe de la MISMA capa de datos que la
 * página (lib/db), así que todo lo que ingiera aquí aparece en /admin al instante.
 *
 * Uso (vía tsx):
 *   npm run operator -- report
 *   npm run operator -- ingest research.json
 *   npm run operator -- outreach <supplierId> "Proyector LED Astronauta"
 *
 * Sin DATABASE_URL escribe al file-store (.data/db.json); con DATABASE_URL, a
 * Neon. El playbook de operación (cómo investigar y contactar) vive en OPERATOR.md.
 */
import fs from "node:fs";
import {
  createCandidate,
  createSupplier,
  listCandidates,
  listSuppliers,
  getSupplierById,
  updateSupplier,
} from "./db";
import { scoreFor } from "./sourcing";
import { draftSupplierOutreach } from "./ai";
import type { SourcingCandidate, Supplier } from "./types";

function loadEnv() {
  try {
    process.loadEnvFile(".env");
  } catch {
    /* sin .env: usa file-store */
  }
}

type CandidateInput = Partial<SourcingCandidate> & { name: string };
type SupplierInput = Partial<Supplier> & { name: string };

function normalizeCandidate(c: CandidateInput): Omit<SourcingCandidate, "id" | "createdAt"> {
  return {
    name: c.name,
    emoji: c.emoji ?? "📦",
    category: c.category ?? "General",
    supplier: c.supplier ?? "",
    supplierId: c.supplierId,
    unitCost: c.unitCost ?? 0,
    estRetail: c.estRetail ?? 0,
    estWholesale: c.estWholesale,
    moq: c.moq,
    trend: c.trend ?? 0.5,
    shipping: c.shipping ?? 0.4,
    stage: c.stage ?? "Detectado",
    signal: c.signal ?? "",
    sourceUrl: c.sourceUrl,
    notes: c.notes,
    origin: c.origin ?? "agente",
    productId: c.productId,
  };
}

async function ingest(file: string) {
  if (!file || !fs.existsSync(file)) {
    console.error(`❌ No encuentro el archivo: ${file}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as {
    candidates?: CandidateInput[];
    suppliers?: SupplierInput[];
  };

  let ns = 0;
  for (const s of data.suppliers ?? []) {
    await createSupplier({ ...s, name: s.name, platform: s.platform ?? "Alibaba" });
    console.log(`  + suplidor: ${s.name} (${s.platform ?? "Alibaba"})`);
    ns++;
  }

  let nc = 0;
  for (const c of data.candidates ?? []) {
    const created = await createCandidate(normalizeCandidate(c));
    console.log(`  + candidato: ${created.emoji} ${created.name} (score ${scoreFor(created)})`);
    nc++;
  }

  console.log(`\n✅ Ingerido: ${nc} candidatos, ${ns} suplidores. Visibles ya en /admin.`);
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

async function main() {
  loadEnv();
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
    default:
      console.log(
        "Comandos:\n  report                      resumen del pipeline y suplidores\n  ingest <file.json>          añade candidatos y/o suplidores\n  outreach <supplierId> [prod] redacta y guarda el mensaje de contacto",
      );
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
