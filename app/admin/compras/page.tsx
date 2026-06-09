import Link from "next/link";
import { listPurchaseOrders, listQuotes, listCandidates, listShipments, listInventoryMovements } from "@/lib/db";
import { money } from "@/lib/format";
import {
  draftPOFromCandidateAction,
  setPurchaseOrderStatusAction,
  deletePurchaseOrderAction,
  createShipmentFromPOAction,
  setShipmentStatusAction,
  deleteShipmentAction,
} from "@/lib/actions";
import type { PurchaseOrder, Quote, Shipment, InventoryMovement } from "@/lib/types";

export const metadata = { title: "Compras — Mi Tiendita PR" };

const PO_STATUSES = [
  "borrador",
  "enviada",
  "confirmada",
  "pagada",
  "produccion",
  "embarcada",
  "recibida",
  "cancelada",
];

const SHIPMENT_STATUSES = ["preparando", "en_transito", "aduana", "entregado"];

export default async function ComprasPage() {
  const pos = await listPurchaseOrders();
  const quotes = await listQuotes();
  const candidates = await listCandidates();
  const shipments = await listShipments();
  const movements = await listInventoryMovements({ limit: 20 });

  return (
    <div className="wrap py-10">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-2">
        <div>
          <span className="eyebrow">Loop de compra</span>
          <h1 className="font-display text-4xl md:text-5xl mt-2">Compras 🧾</h1>
        </div>
        <Link href="/admin/aprobaciones" className="btn btn-ghost btn-sm">Ver aprobaciones →</Link>
      </div>
      <p className="text-sm mb-8" style={{ color: "var(--color-ink-soft)" }}>
        Cotizaciones de suplidores y órdenes de compra. Redactar una OC abre un gate de aprobación;
        recibir una OC sube el inventario (ver Inventario en cada producto).
      </p>

      {/* draft a PO from a candidate */}
      <section className="mb-10">
        <div className="card p-4">
          <h2 className="font-display text-lg mb-3">Redactar orden de compra</h2>
          <form action={draftPOFromCandidateAction} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
            <div className="flex-1">
              <label className="label" htmlFor="cid">Candidato</label>
              <select id="cid" name="cid" className="field" required defaultValue="">
                <option value="" disabled>Escoge un candidato…</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.name} — ${c.unitCost}/u · {c.supplier || "sin suplidor"}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-full sm:w-32">
              <label className="label" htmlFor="qty">Cantidad</label>
              <input id="qty" name="qty" type="number" min={1} className="field" placeholder="100" />
            </div>
            <button className="btn btn-primary">Crear OC →</button>
          </form>
        </div>
      </section>

      {/* purchase orders */}
      <section className="mb-12">
        <h2 className="font-display text-2xl mb-4">Órdenes de compra ({pos.length})</h2>
        {pos.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>Aún no hay órdenes.</p>
        ) : (
          <div className="space-y-3">
            {pos.map((po) => <POCard key={po.id} po={po} />)}
          </div>
        )}
      </section>

      {/* quotes */}
      <section className="mb-12">
        <h2 className="font-display text-2xl mb-4">Cotizaciones ({quotes.length})</h2>
        {quotes.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>
            Sin cotizaciones todavía. Llegan cuando un suplidor responde (vía Hermes o el operador).
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {quotes.map((q) => <QuoteCard key={q.id} q={q} />)}
          </div>
        )}
      </section>

      {/* shipments */}
      <section className="mb-12">
        <h2 className="font-display text-2xl mb-4">Embarques ({shipments.length})</h2>
        {shipments.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>Sin embarques. Crea uno desde una orden de compra.</p>
        ) : (
          <div className="space-y-2">
            {shipments.map((s) => <ShipmentRow key={s.id} s={s} />)}
          </div>
        )}
      </section>

      {/* inventory movements */}
      <section className="mb-12">
        <h2 className="font-display text-2xl mb-4">Movimientos de inventario (últimos {movements.length})</h2>
        {movements.length === 0 ? (
          <p style={{ color: "var(--color-muted)" }}>Sin movimientos. Recibir una OC o vender genera entradas aquí.</p>
        ) : (
          <div className="space-y-2">
            {movements.map((m) => <MovementRow key={m.id} m={m} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function ShipmentRow({ s }: { s: Shipment }) {
  return (
    <div className="card-flat px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <span className="font-semibold">{s.productName}</span>
        {s.carrier && <span className="text-sm ml-2" style={{ color: "var(--color-ink-soft)" }}>{s.carrier}</span>}
        {s.tracking && <span className="font-mono text-xs ml-2" style={{ color: "var(--color-muted)" }}>{s.tracking}</span>}
      </div>
      <div className="flex items-center gap-2">
        <form action={setShipmentStatusAction} className="flex items-center gap-1">
          <input type="hidden" name="sid" value={s.id} />
          <select name="status" defaultValue={s.status} className="field text-xs w-auto" style={{ padding: "6px 8px" }}>
            {SHIPMENT_STATUSES.map((st) => <option key={st} value={st}>{st.replace("_", " ")}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" title="Cambiar estado">✓</button>
        </form>
        <form action={deleteShipmentAction}>
          <input type="hidden" name="sid" value={s.id} />
          <button className="btn btn-ghost btn-sm" title="Eliminar" style={{ color: "var(--color-coral-deep)" }}>✕</button>
        </form>
      </div>
    </div>
  );
}

function MovementRow({ m }: { m: InventoryMovement }) {
  const positive = m.delta >= 0;
  return (
    <div className="card-flat px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <span className="badge badge-soft capitalize mr-2">{m.reason}</span>
        <span className="font-semibold">{m.productName}</span>
      </div>
      <span className="font-display text-lg" style={{ color: positive ? "var(--color-teal-deep)" : "var(--color-coral-deep)" }}>
        {positive ? "+" : ""}{m.delta}
      </span>
    </div>
  );
}

function POCard({ po }: { po: PurchaseOrder }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-display text-lg leading-tight">{po.qty}× {po.productName}</h3>
          <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>
            {po.supplierName} · ${po.unitCost}/u{po.shippingCost ? ` + ${money(po.shippingCost)} envío` : ""}
          </p>
          {po.notes && <p className="text-xs mt-1" style={{ color: "var(--color-muted)" }}>{po.notes}</p>}
        </div>
        <div className="text-right">
          <div className="font-display text-xl">{money(po.total)}</div>
          <span className="badge badge-soft capitalize mt-1">{po.status}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4 items-center">
        <form action={setPurchaseOrderStatusAction} className="flex items-center gap-1">
          <input type="hidden" name="poId" value={po.id} />
          <select name="status" defaultValue={po.status} className="field text-xs w-auto capitalize" style={{ padding: "6px 8px" }}>
            {PO_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
          </select>
          <button className="btn btn-ghost btn-sm" title="Cambiar estado">✓</button>
        </form>
        <form action={deletePurchaseOrderAction}>
          <input type="hidden" name="poId" value={po.id} />
          <button className="btn btn-ghost btn-sm" title="Eliminar" style={{ color: "var(--color-coral-deep)" }}>✕</button>
        </form>
      </div>

      <details className="mt-3">
        <summary className="text-sm font-semibold cursor-pointer" style={{ color: "var(--color-grape)" }}>
          ➤ Crear embarque
        </summary>
        <form action={createShipmentFromPOAction} className="grid sm:grid-cols-3 gap-2 mt-3">
          <input type="hidden" name="poId" value={po.id} />
          <input name="carrier" className="field text-sm" placeholder="Carrier (DHL, Matson…)" />
          <input name="tracking" className="field text-sm" placeholder="Tracking #" />
          <button className="btn btn-primary btn-sm">Crear embarque</button>
        </form>
      </details>
    </div>
  );
}

function QuoteCard({ q }: { q: Quote }) {
  return (
    <div className="card p-5">
      <h3 className="font-display text-lg leading-tight">{q.productName}</h3>
      <p className="text-sm" style={{ color: "var(--color-ink-soft)" }}>{q.supplierName}</p>
      <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
        <Field label="Precio/u" value={`$${q.unitCost}`} />
        {q.moq ? <Field label="MOQ" value={String(q.moq)} /> : null}
        {q.leadTimeDays ? <Field label="Lead time" value={`${q.leadTimeDays} días`} /> : null}
        {q.sampleCost ? <Field label="Muestra" value={`$${q.sampleCost}`} /> : null}
        {q.shippingToPR ? <Field label="Envío a PR" value={`$${q.shippingToPR}`} /> : null}
      </div>
      {q.notes && <p className="text-xs mt-2" style={{ color: "var(--color-muted)" }}>{q.notes}</p>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: "var(--color-muted)" }}>{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
