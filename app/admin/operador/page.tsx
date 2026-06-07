import Link from "next/link";
import { buildBrief } from "@/lib/control";
import { operatorIngestAction, markQueueDoneAction } from "@/lib/actions";

export const metadata = { title: "Consola del operador — Mi Tiendita PR" };

const SCHEMA_EXAMPLE = `{
  "candidates": [
    {
      "name": "Mini Ventilador de Cuello USB",
      "emoji": "🌀",
      "category": "Tech & Gadgets",
      "supplier": "Shenzhen Glow Co.",
      "unitCost": 4.2,
      "estRetail": 16.99,
      "estWholesale": 8.5,
      "moq": 100,
      "trend": 0.86,
      "shipping": 0.3,
      "signal": "+210% búsquedas verano PR",
      "sourceUrl": "https://www.alibaba.com/product-detail/...",
      "imageUrl": "https://s.alicdn.com/....jpg"
    }
  ],
  "suppliers": [
    { "name": "Shenzhen Glow Co.", "platform": "Alibaba", "url": "https://...", "country": "China", "products": "gadgets virales" }
  ],
  "quotes": [
    { "productName": "Mini Ventilador de Cuello USB", "supplierName": "Shenzhen Glow Co.", "unitCost": 3.9, "moq": 200, "leadTimeDays": 18, "sampleCost": 12, "shippingToPR": 1.1 }
  ]
}`;

function feedback(sp: { ok?: string; err?: string }): { ok: boolean; msg: string } | null {
  if (sp.ok) {
    const [c, s, q] = sp.ok.split("-");
    return { ok: true, msg: `Depositado: ${c} candidatos, ${s} suplidores, ${q} cotizaciones. Visibles en Aprobaciones.` };
  }
  if (sp.err) {
    const map: Record<string, string> = {
      auth: "No autorizado.",
      vacio: "El campo estaba vacío.",
      json: "JSON inválido — revisa las comillas y las comas.",
      nada: "El JSON no traía candidates/suppliers/quotes.",
      name: "Cada candidato y suplidor necesita un \"name\".",
    };
    return { ok: false, msg: map[sp.err] ?? "Algo falló al depositar." };
  }
  return null;
}

export default async function OperadorPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const fb = feedback(sp);
  const brief = await buildBrief("chrome");

  return (
    <div className="wrap py-10">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
        <div>
          <span className="eyebrow">El puente con la extensión</span>
          <h1 className="font-display text-4xl md:text-5xl mt-2">Consola del operador 🔌</h1>
        </div>
        <Link href="/admin/aprobaciones" className="btn btn-ghost btn-sm">Ir a Aprobaciones →</Link>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--color-ink-soft)" }}>
        El pase por el brain para Claude-en-Chrome: <strong>lee</strong> el brief, ejecuta la cola de
        outreach en Alibaba y <strong>deposita</strong> los hallazgos abajo. Tú apruebas en Aprobaciones.
      </p>

      {fb && (
        <div
          className="card-flat px-4 py-3 mb-6 text-sm"
          style={fb.ok ? { background: "#dff5e6", borderColor: "#9ad7b0" } : { background: "#ffe0d8", borderColor: "#e0a89a" }}
        >
          {fb.ok ? "✅ " : "⚠️ "}{fb.msg}
        </div>
      )}

      {/* 1) Cola de outreach aprobada */}
      <section className="mb-10">
        <h2 className="font-display text-2xl mb-1">1 · Cola de outreach aprobada ({brief.queue.length})</h2>
        <p className="text-sm mb-4" style={{ color: "var(--color-ink-soft)" }}>
          Mensajes que Miguel ya aprobó. Envíalos en Alibaba y marca cada uno como enviado.
        </p>
        {brief.queue.length === 0 ? (
          <div className="card p-6 text-center" style={{ color: "var(--color-muted)" }}>
            Nada en cola. Aprueba un outreach en Aprobaciones y aparecerá aquí.
          </div>
        ) : (
          <div className="space-y-3">
            {brief.queue.map((t) => {
              const subject = t.payload?.subject ? String(t.payload.subject) : "";
              const bodyMsg = t.payload?.body ? String(t.payload.body) : "";
              return (
                <div key={t.id} className="card p-5">
                  <h3 className="font-display text-lg leading-tight">{t.title}</h3>
                  {(subject || bodyMsg) && (
                    <pre className="text-xs mt-2 p-3 rounded-xl whitespace-pre-wrap" style={{ background: "var(--color-cream-2)" }}>
{subject ? `Asunto: ${subject}\n\n` : ""}{bodyMsg}
                    </pre>
                  )}
                  <form action={markQueueDoneAction} className="flex items-center gap-2 mt-3 flex-wrap">
                    <input type="hidden" name="tid" value={t.id} />
                    <input name="note" className="field text-sm flex-1 min-w-[200px]" placeholder="Nota (ej. enviado, respondió en 2h)" />
                    <button className="btn btn-primary btn-sm">✅ Marcar enviado</button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 2) El brief (lo que la extensión lee) */}
      <section className="mb-10">
        <h2 className="font-display text-2xl mb-1">2 · El brief (recall)</h2>
        <p className="text-sm mb-4" style={{ color: "var(--color-ink-soft)" }}>
          Identidad, reglas, parámetros de sourcing, lo ya conocido (no dupliques) y decisiones recientes.
        </p>
        <pre
          className="text-xs p-4 rounded-2xl whitespace-pre-wrap overflow-auto"
          style={{ background: "var(--color-ink)", color: "var(--color-cream)", maxHeight: "28rem" }}
        >
{brief.briefing}
        </pre>
      </section>

      {/* 3) Depositar hallazgos */}
      <section className="mb-10">
        <h2 className="font-display text-2xl mb-1">3 · Depositar hallazgos</h2>
        <p className="text-sm mb-4" style={{ color: "var(--color-ink-soft)" }}>
          Pega lo que encontraste en Alibaba como JSON. Cae al brain (origen <code>chrome</code>) y cada
          candidato abre un gate de aprobación. Máximo {brief.parameters.maxPerRun} candidatos por corrida.
        </p>
        <form action={operatorIngestAction} className="space-y-3">
          <textarea
            name="payload"
            className="field font-mono text-xs"
            rows={14}
            placeholder={SCHEMA_EXAMPLE}
            spellCheck={false}
          />
          <div className="flex items-center gap-3 flex-wrap">
            <button className="btn btn-primary">Depositar →</button>
            <details className="text-xs" style={{ color: "var(--color-muted)" }}>
              <summary className="cursor-pointer">Ver formato esperado</summary>
              <pre className="mt-2 p-3 rounded-xl whitespace-pre-wrap" style={{ background: "var(--color-cream-2)" }}>{SCHEMA_EXAMPLE}</pre>
            </details>
          </div>
        </form>
      </section>
    </div>
  );
}
