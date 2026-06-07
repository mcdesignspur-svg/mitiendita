# OPERATIONS.md — El sistema operativo AI-first de Mi Tiendita PR

Plan maestro para automatizar la operación completa: desde descubrir productos en
Alibaba hasta venderlos y reabastecerlos en Puerto Rico, con Miguel aprobando solo
en los puntos de riesgo. Complementa:

- **`CLAUDE.md`** — arquitectura del código (capa de datos, tipos, sync discipline).
- **`OPERATOR.md`** — playbook de Claude como agente operador (research/outreach).
- **`OPERATIONS.md`** (este) — el sistema completo: etapas, agentes, datos y roadmap.

> Regla de oro (de OPERATOR.md): la automatización es ventaja interna y **nunca**
> aparece en copy público. El cliente ve una tienda boricua con buen surtido.

---

## 1. La operación es UNA línea de ensamblaje (12 etapas)

Cada producto recorre el mismo carril. El "estado" de cada entidad es lo que mueve
la pieza a la próxima etapa. Los ✅ son los **gates** donde Miguel decide.

| #  | Etapa | Quién la hace | Output (dato) | Gate |
|----|-------|---------------|---------------|------|
| 1  | Descubrir | Chrome ext. (Alibaba) + operador (tendencias web) | `SourcingCandidate` | — |
| 2  | Evaluar (score/margen/encaje) | Operador + AI in-app | candidato puntuado | ✅ aprobar candidato |
| 3  | Cotizar / contactar | Chrome ext. (mensajea en Alibaba) | `Quote` + `Supplier` | ✅ aprobar envío |
| 4  | Negociar / decidir | Operador (compara cotizaciones) | candidato → `Negociando` | ✅ elegir suplidor |
| 5  | Ordenar (compromiso de $) | Operador redacta, Miguel firma | `PurchaseOrder` | ✅ aprobar compra |
| 6  | Producir / embarcar | Chrome ext. (lee status) + operador | `Shipment` | — |
| 7  | Recibir / inventariar | Almacén confirma, operador reconcilia | `InventoryMovement` | confirmar recibo |
| 8  | Publicar (ficha/fotos/precios) | AI in-app draft | `Product` activo | ✅ activar |
| 9  | Promocionar | Operador + AI in-app | `Campaign` | ✅ aprobar |
| 10 | Vender | La tienda (ya existe) | `Order` | — |
| 11 | Cumplir (envío al cliente) | Operador + Miguel | `Order.status` | — |
| 12 | Reabastecer (stock bajo → recompra) | Operador (cron) | vuelve a #5/#3 | ✅ |

**Hoy cubierto:** #1, #2, #3 (parcial), #8, #10. **Falta el loop de dinero+físico:**
cotización → orden → embarque → inventario → promoción → recompra.

---

## 2. Arquitectura: 3 capas, el dato es el cerebro

- **Capa A — La página (`/admin` + tienda):** la consola de control. Miguel ve todo
  y **aprueba** aquí. La cola de aprobaciones vive en `/admin/aprobaciones`.
- **Capa B — Los agentes (las manos):**
  - **Chrome ext. (Claude en el navegador):** ojos y manos en Alibaba. Deposita por
    `POST /api/operator/ingest` y recoge trabajo aprobado del queue saliente.
  - **Claude Code / operador:** orquesta el resto vía `lib/operator.ts` (CLI) + crons.
  - **Crons de Vercel:** el reloj — barrido de sourcing, follow-ups, chequeo de stock,
    reconciliación de pagos.
- **Capa C — El brain compartido (la DB):** **el `status` ES el contrato.** Una
  transición de estado dispara el trabajo del próximo agente. Ya funciona así con
  `SourcingCandidate.stage` y `Supplier.status`; se extiende a todas las entidades.

### El bus: pase por el brain + dos vías

**La extensión de Chrome es _stateless_ (no tiene memoria persistente). El brain
(la DB) ES su memoria.** Por eso el paso 0 de CADA corrida es un *pase por el brain*
para recoger contexto — antes de descubrir, contactar o cualquier tarea. El ciclo es
**read → act → write → log**:

- `GET  /api/operator/brief?agent=chrome` — **el pase por el brain (primero, siempre).**
  Un solo read que da consciencia situacional completa. Devuelve:
  1. **Identidad + reglas** — quién es, qué puede/no puede hacer, `SURTIDO_RULE`, gates.
  2. **Estado actual** — candidatos/suplidores ya conocidos → **no duplica ni recontacta**.
  3. **Cola aprobada** — los `ApprovalTask` para `chrome`, con el mensaje ya redactado.
  4. **Decisiones recientes** — qué aprobó/rechazó Miguel y por qué → **calibración**.
  5. **Parámetros de sourcing** — margen objetivo, MOQ techo, categorías foco.

  Incluye un campo `briefing` en markdown ya digerido (para que Claude lo lea de
  corrido) respaldado por los datos estructurados.
- `POST /api/operator/ingest` — deposita lo descubierto (extensión → sistema). *Existe; se amplía.*
- `POST /api/operator/queue/:id/done` — reporta el resultado de una tarea de la cola.

Flujo completo: la extensión hace su **brief** → descubre/contacta según reglas, estado
y cola → deposita por `ingest` y cierra tareas con `done` → todo queda en `AgentRun`.
(El operador redacta outreach → Miguel aprueba → el `ApprovalTask` aparece en el
próximo `brief` de la extensión, que lo ejecuta en Alibaba y reporta de vuelta.)

**Trigger = shortcuts en schedule (pull, no push).** La extensión NO corre continua:
se levanta por atajos programados. El sistema nunca le empuja trabajo; ella lo hala con
el `brief` en cada despertar. Implicaciones de diseño:
- **Cada corrida es autosuficiente** — el `brief` es la única fuente de contexto de esa
  corrida (por eso trae reglas + estado + cola + decisiones de una sola lectura).
- **Latencia ≈ el intervalo del schedule** — lo aprobado se ejecuta en el próximo
  despertar; por eso la cola del `brief` debe venir priorizada (lo urgente arriba).
- **Tope por corrida** — como corre desatendida, el `brief` lleva `maxPerRun` (máx
  candidatos nuevos por corrida) para que no se desboque ni duplique.

---

## 3. Plano de datos (entidades nuevas)

Siguiendo la sync discipline de `CLAUDE.md` (`types.ts → schema.ts → db-postgres.ts`
mapper+CRUD → `db-file.ts` CRUD+migrate → `db.ts` re-export tipado contra `pg.*` →
seed). En orden de palanca:

1. **`ApprovalTask`** — cola unificada de decisiones de Miguel. *Lo que hace confiable
   automatizar.* `kind` ∈ {candidato, outreach, orden_compra, activar_producto,
   promocion, recibo, recompra}; `status` ∈ {pendiente, aprobada, rechazada};
   `payload` (JSON con lo necesario para ejecutar al aprobar); `relatedType/relatedId`;
   `createdBy`; `decidedAt/decisionNote`.
2. **`AgentRun`** (bitácora) — `agent` ∈ {chrome, operador, cron, app}; `action`;
   `status` ∈ {ok, error, parcial}; `summary`; `meta` (JSON: counts, ids tocados);
   `startedAt/finishedAt`. Observabilidad + auditoría.
3. **`PurchaseOrder`** — cierra el loop de $: `supplierId`, líneas (producto/candidato,
   qty, unitCost), `total`, `status` ∈ {borrador, enviada, confirmada, pagada,
   produccion, embarcada, recibida, cancelada}, fechas.
4. **`Quote`** — captura estructurada de precio/MOQ/lead-time/muestra por
   suplidor+producto (empieza embebida en `Supplier`, gradúa a entidad para comparar).
5. **`Shipment`** — `purchaseOrderId`, carrier, tracking, ETA, estado aduana, status.
6. **`InventoryMovement`** — entradas/salidas; `Product.stock` pasa a ser saldo
   calculado, no un número suelto. Tipos: recibo, venta, ajuste, merma.
7. **`Campaign`** — promociones programadas (segmento, descuento, ventana, copy).

---

## 4. Plano de control (los gates)

Regla mecánica: **el agente nunca cruza un gate de dinero, contacto externo o
publicación sin OK de Miguel.** Cada gate crea un `ApprovalTask`; al aprobarlo, un
dispatcher (`lib/control.ts`) ejecuta el efecto según el `kind`:

- aprobar **candidato** → avanza `stage` y habilita cotización.
- aprobar **outreach** → encola la tarea para la extensión (queue saliente).
- aprobar **orden_compra** → marca el PO `enviada` y lo encola.
- aprobar **activar_producto** → `Product.active = true`.
- aprobar **promocion** → activa la `Campaign`.
- confirmar **recibo** → crea `InventoryMovement` y sube stock.
- aprobar **recompra** → crea la orden de compra (`enviada`).

Toda acción de agente/cron escribe un `AgentRun`. Aprobaciones: **solo `/admin`** en
la fase 1 (WhatsApp/email en fase posterior, detrás de la misma interfaz `notify`).

---

## 5. Roadmap por fases — TODAS CONSTRUIDAS ✅ (2026-06-07)

**Fase 1 — El cerebro de control** ✅
- `ApprovalTask` + `AgentRun` (full sync discipline).
- `lib/control.ts`: `createTask()`, `logRun()`, `dispatchApproval(task)`, `buildBrief()`.
- `/admin/aprobaciones` (cola) + contador en el home + `/admin/bitacora`.
- Gates cableados: ingest y outreach crean `ApprovalTask`; cada corrida escribe `AgentRun`.

**Fase 2 — El loop de compra** ✅
- `Quote` + `PurchaseOrder` + `draftPurchaseOrder()` (abre gate `orden_compra`).
- Operador: comando `po <candidateId> [qty]`. Admin: `/admin/compras` + form desde candidato.

**Fase 3 — El loop físico** ✅
- `Shipment` (tracking) + `InventoryMovement`; `lib/inventory.ts → adjustStock()` mantiene
  `Product.stock` como saldo (= suma de movimientos).
- **Recibir** una OC (`status → recibida`) sube el inventario del producto enlazado.
- **Venta** descuenta inventario (reserva al crear la orden; best-effort, nunca rompe checkout).
- Recompra: el cron detecta stock bajo (`≤ ${LOW_STOCK_THRESHOLD}`) → gate `recompra`; al
  aprobar, `dispatchApproval` crea la OC.

**Fase 4 — El puente con la extensión** ✅
- `GET /api/operator/brief` (pase por el brain) + `POST /api/operator/queue/[id]/done` (ack).
- Ingest ampliado: acepta `quotes` y `imageUrl` en candidatos. El brief trae cotizaciones
  recientes + cola FIFO (lo aprobado más viejo primero).

**Fase 5 — Promoción + cadencia autónoma** ✅
- `Campaign` (descuento + segmento + ventana + copy AI) → gate `promocion`; al aprobar aplica
  el descuento a los productos; finalizar/expirar lo quita. Admin: `/admin/promociones`.
- Cron diario `GET /api/cron/daily` (programado en `vercel.json`, 09:00 UTC): recompra por
  stock bajo, finaliza promociones vencidas, cuenta follow-ups de suplidores y pagos
  pendientes; resume en la bitácora. Auth por `CRON_SECRET` (si está; en dev se permite).

> **Pendiente / futuro (no construido):** envío real por canal (WhatsApp/email) — hoy los
> outreach/POs aprobados quedan en la cola para que la extensión los ejecute; reporte
> semanal por email; barrido de sourcing autónomo dentro del cron (depende de AI key).
> Plan Hobby de Vercel: 1 cron diario (ya configurado). Más crons/granularidad → plan Pro.

---

## 6. Principios de diseño (no romper)

- **El status es el contrato.** Automatizar = consultar entidades en un estado, hacer
  el trabajo, avanzar el estado (o crear un gate). Robusto, observable, resumible.
- **Los agentes son stateless; el brain es su memoria.** La extensión de Chrome no
  recuerda nada entre corridas. Por eso SIEMPRE empieza con un pase por el brain
  (`GET /brief`) y opera **read → act → write → log**. Nunca actúa sin recall.
- **Sync discipline** en cada entidad nueva (ver `CLAUDE.md`).
- **Degradación elegante**: todo agente/AI cae a un resultado determinista sin keys.
- **Gates de dinero/contacto/publicación = humanos**, siempre.
- **Todo agente deja rastro** (`AgentRun`). Nada corre a ciegas.
