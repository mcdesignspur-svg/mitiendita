# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Mi Tiendita PR** — a B2C + B2B storefront for imported viral/high-utility products in Puerto Rico. B2C is a public retail catalog with a cart; B2B lets businesses register with their *Registro de Comerciante*, and once an admin verifies them, wholesale prices unlock across the whole catalog. An internal password-protected ops panel (`/admin`) handles business verification, a sourcing pipeline mockup, and a marketing-copy generator.

The codebase and UI are written in **Spanish (boricua)** — identifiers, routes, and copy are all Spanish. Match that when adding code (e.g. `negocios`, `carrito`, `precio mayorista`). Internal automation is an operational advantage and is **never surfaced in public-facing copy**.

## Commands

```bash
npm run dev          # Next dev server → http://localhost:3000
npm run build        # production build
npm start            # serve production build
npm run lint         # eslint . (flat config in eslint.config.mjs; instala deps con npm i -D eslint eslint-config-next @eslint/eslintrc)

npm run db:push      # sync lib/schema.ts → Postgres/Neon (no migration files; uses drizzle-kit push)
npm run db:seed      # insert SEED_PRODUCTS + demo businesses + sourcing seeds (idempotent)
npm run db:studio    # Drizzle Studio

npm run operator -- report                       # Claude-as-operator: pipeline + suppliers summary
npm run operator -- ingest <file.json>           # write researched candidates/suppliers into the system
npm run operator -- outreach <supplierId> [prod] # draft + save first-contact message (see OPERATOR.md)
```

There is **no test framework** in this project.

Demo credentials: business verified `demo@gasolinera.pr` / `demo1234`; business pending `farmacia@salud.pr` / `salud1234`; admin panel `/admin` password `admin` (override with `ADMIN_PASSWORD`).

## Architecture

**Stack:** Next.js 16 (App Router, Server Actions, Turbopack) · React 19 · TypeScript strict · Tailwind CSS v4 · Vercel AI SDK.

### Switchable data layer — the central design

`lib/db.ts` re-exports one of two interchangeable adapters, resolved **per-call** at runtime (not at import time):

- **No `DATABASE_URL`** → `lib/db-file.ts` (JSON file at `/.data/db.json`, zero setup, seeds itself on first read).
- **`DATABASE_URL` set** → `lib/db-postgres.ts` (Neon Postgres via Drizzle, lazy client in `lib/drizzle.ts`).

**Script env-load gotcha:** any `tsx` script that imports `./db` must `import "./load-env"` FIRST — otherwise `DATABASE_URL` may not be loaded yet and the script silently falls back to the file-store even in prod.

Both adapters expose the **exact same async function signatures**, so pages/actions/auth never branch on the backend. **When you add or change a data operation, you must update both `db-file.ts` and `db-postgres.ts` and re-export it from `db.ts` with matching types** — `db.ts` types every export against the `pg` module (`typeof pg.x`), so a drift in signatures breaks the build.

### Domain types are canonical

`lib/types.ts` defines the app-facing shapes (`Product`, `Business`, `Order`). The Postgres adapter maps DB rows back to these via `toProduct`/`toBusiness`/`toOrder`, deliberately dropping internal columns (e.g. the `seq` ordering serial). `lib/schema.ts` (Drizzle pgTable defs) must stay in sync with `types.ts`.

**Adding a `Product` field touches six places:** `lib/types.ts`, `lib/schema.ts`, the `toProduct` mapper in `db-postgres.ts`, `parseProductForm` in `lib/actions.ts`, `components/product-form.tsx`, and the `SEED_PRODUCTS` entries in `lib/products.ts`.

### Seed data

`lib/products.ts → SEED_PRODUCTS` is the single product seed source, consumed by **both** `db-file.ts` (`seed()`) and the Postgres seed script `lib/seed.ts`. `lib/sourcing.ts → SEED_CANDIDATES` / `SEED_SUPPLIERS` seed the operational spine into those same two files. The two demo businesses are duplicated there too — keep them aligned. `db-file.ts`'s `migrate()` backfills the `sourcingCandidates`/`suppliers` keys into older `db.json` files.

**New persisted entities (`SourcingCandidate`, `Supplier`, `ApprovalTask`, `AgentRun`, `Quote`, `PurchaseOrder`, `Shipment`, `InventoryMovement`, `Campaign`) follow the same sync discipline as products:** `lib/types.ts` → `lib/schema.ts` → mapper + CRUD in `db-postgres.ts` → matching CRUD in `db-file.ts` (+ `migrate()` backfill of the new `db.json` keys) → re-export in `db.ts` (typed against `pg.*`) → seed where applicable. The control/ops entities seed empty (no `SEED_*`). All `jsonb`/optional columns map back to `undefined` in the mappers.

### Mutations = Server Actions

All writes live in `lib/actions.ts` (`"use server"`). Form actions follow the `useActionState` contract: `(prevState, FormData) => Promise<FormState>`, returning `{ error }` or `redirect()`-ing on success. **Every admin action guards with `if (!(await isAdmin())) return ...`** before mutating — preserve that check on new admin actions.

### Auth & price gating

`lib/auth.ts` issues two **HMAC-signed cookies** (no external auth dep): `mt_session` (business id) and `mt_admin`. `getSessionBusiness()` resolves the cookie to a `Business`; pages show `product.wholesale` (+ MOQ) when its `status === "verified"`, otherwise `product.retail`. Password hashing is in `lib/crypto.ts` (scrypt) — kept a **pure Node module with no Next imports** so the seed script can use it. `/admin` is gated at the layout level (`app/admin/layout.tsx` renders `<AdminLogin/>` when not admin).

### Cart

Client-side only: `components/cart-context.tsx` persists lines to `localStorage` (`mt_cart_v1`). Checkout serializes items to JSON in a hidden field and posts to `checkoutAction`. Order shipping = the max `shippingPrice` across cart items.

### AI core (graceful degradation) — the brain

`lib/ai.ts` is the centralized AI layer. Every call routes through the Vercel AI Gateway via plain `"provider/model"` strings (`AI_MODEL`, default `"anthropic/claude-sonnet-4-6"`) and uses **`generateObject` + zod schemas** for reliable structured output. The internal `runObject(schema, {...})` helper returns `null` when `AI_GATEWAY_API_KEY` is missing or the call throws, so **every public function falls back to a deterministic local result** — the whole app works with no key. `aiEnabled()` reports whether the real model is active.

Exports: `generateMarketingCopy` (copy), `generateProductDraft` (admin autofill), `brainstormCandidates` (in-app sourcing ideas), `assessBusiness` (B2B verification copilot), `draftSupplierOutreach` (supplier first-contact), `shopAssistant` (storefront chat), plus the pure `viralScore`. When adding an AI feature, follow the same shape: zod schema → `runObject` → deterministic fallback.

### AI-first operating system (the hybrid model)

This is a **hybrid between the app and Claude as an operator agent** (see `OPERATOR.md`). Two interchangeable writers feed one shared data spine:

- **In-app** automations (admin panel) — autofill, brainstorm candidates, verification copilot, outreach drafts.
- **Claude as operator** — does real web research + supplier outreach and writes results into the *same* tables via the **operator bridge** `lib/operator.ts` (`npm run operator -- report | ingest <file.json> | outreach <supplierId> [product] | alibaba "<query>"`). It reads/writes through `lib/db`, so anything ingested shows up in `/admin` immediately. **Script env-load gotcha:** any tsx script that imports `./db` must `import "./load-env"` FIRST (loads `.env` before `lib/db` binds file-store vs Postgres) — otherwise it silently writes to the local file-store even with `DATABASE_URL` set.
- **Hermes (computer use)** — the local autonomous agent (Nous [Hermes Agent](https://hermes-agent.nousresearch.com) + `cua-driver`) that **replaced the old Chrome extension**. It drives the real logged-in Chrome to do Alibaba research + supplier outreach, hitting the operator bus (brief → ingest → queue done) with `OPERATOR_INGEST_TOKEN`. Playbook in `lib/hermes-playbook.ts`; skill + config in `hermes/`; setup in `HERMES-AGENT.md`. The `AgentName` `"hermes"` is the canonical browser agent (`"chrome"` kept only for legacy logs).

**Ingest webhook (multi-agent brain)** — `lib/ingest.ts` (`ingestPayload` + `normalizeCandidate`) is the shared writer used by BOTH the operator CLI and the HTTP webhook `POST /api/operator/ingest`. The webhook lets any external agent (**Hermes** — the local computer-use agent that replaced the old Chrome extension, see `HERMES-AGENT.md`; a cron; Zapier) deposit candidates/suppliers into the same DB; it's gated by `OPERATOR_INGEST_TOKEN` (Bearer) and disabled (503) when that env is unset. Body: `{ candidates: [...], suppliers: [...] }` (same shape as the `ingest <file.json>` JSON).

**Alibaba.com Open Platform (ICBU) client** — `lib/alibaba.ts` is a signed IOP `/rest` gateway client (HMAC-SHA256 of `apiPath + sorted key+value concat`, hex uppercase; system params `app_key`/`timestamp`(ms)/`sign_method=sha256`/`access_token`). `alibabaEnabled()` gates on `ALIBABA_APP_KEY`+`ALIBABA_APP_SECRET`; without them everything returns null and the operator falls back. Exposes `alibabaCall`, `createAccessToken` (OAuth `/auth/token/create`), `searchProducts`, `getProduct`. The exact ICBU product API paths/response schema are **unconfirmed** (couldn't read the SPA docs) — paths are env-overridable (`ALIBABA_PRODUCT_SEARCH_PATH`/`_GET_PATH`) and `operator -- alibaba` prints the raw response so the candidate-mapping can be finalized against a real payload.

The **operational spine** adds two persisted entities — `SourcingCandidate` (sourcing pipeline) and `Supplier` (proveedores). `lib/sourcing.ts` holds `SEED_CANDIDATES` + `SEED_SUPPLIERS` and the `scoreFor`/`viralScore` scoring (no longer static mock data). The admin sourcing/suppliers sections read these from the DB; "→ Crear producto" promotes a candidate into an inactive product **draft** for human review.

**Control plane (the brain) — `lib/control.ts`.** The full automation plan lives in `OPERATIONS.md` (all 5 phases built). Backed by `ApprovalTask` (human-in-the-loop gates Miguel approves at `/admin/aprobaciones`) and `AgentRun` (agent/cron audit log at `/admin/bitacora`). `lib/control.ts` exposes `createTask()`, `logRun()`, `dispatchApproval(task)` (kind-specific effect on approve: candidato/outreach/orden_compra/recibo/recompra/activar_producto/promocion), `draftPurchaseOrder()`, `receivePurchaseOrder()`, and `buildBrief(agent)` (the stateless Hermes agent's "brain pass"; `agent` defaults to `"hermes"`). The operator **bus**, all gated by `OPERATOR_INGEST_TOKEN` via `lib/operator-auth.ts`: `GET /api/operator/brief` (read context), `POST /api/operator/ingest` (deposit candidates/suppliers/quotes), `POST /api/operator/queue/[id]/done` (ack). Other key modules: `lib/inventory.ts` (`adjustStock` — `Product.stock` is the running sum of `InventoryMovement`; sales decrement via `applyOrderInventory` in `checkoutAction`, receiving a PO increments), and `lib/cron.ts` (`runDailyMaintenance` behind `GET /api/cron/daily`, scheduled in `vercel.json`, auth `CRON_SECRET`). Admin sections: `/admin/aprobaciones`, `/admin/compras` (POs + quotes + shipments + movements), `/admin/promociones`, `/admin/bitacora`. **Ingesting candidates, drafting outreach, drafting POs, and creating campaigns all open gates instead of acting directly — preserve that when extending the operation.**

### Notifications (graceful degradation)

`lib/notify.ts` sends email via the Resend REST API **only if `RESEND_API_KEY` is set** (no SDK dep); otherwise it logs and no-ops. Wired into `checkoutAction` (order confirmation) and `approveBusinessAction` (verification email). Supplier outreach is **draft-only** by design — never auto-sent without approval (see `OPERATOR.md` guardrails). WhatsApp will plug in behind the same interface.

### Styling

Tailwind v4 is **CSS-first**: there is no `tailwind.config.*`. Design tokens (boricua tropical-modern palette, fonts, shadows) are declared in `app/globals.css` under `@theme` and consumed as `var(--color-coral)` etc. Fonts are loaded via `next/font/google` in `app/layout.tsx`.

## Environment

Copy `.env.example` → `.env`. Vars: `SESSION_SECRET`, `ADMIN_PASSWORD`, `AI_GATEWAY_API_KEY` (optional — turns on the real AI brain), `AI_MODEL` (optional — gateway model string), `RESEND_API_KEY` + `EMAIL_FROM` (optional — transactional email), `BLOB_READ_WRITE_TOKEN` (optional — product image uploads), `DATABASE_URL` (optional — toggles Postgres), `DATABASE_URL_UNPOOLED` (preferred by `drizzle.config.ts` for DDL; Neon direct/unpooled connection), `OPERATOR_INGEST_TOKEN` (optional — enables the operator bus: ingest/brief/queue; disabled when unset), `CRON_SECRET` (optional — Vercel cron auth for `/api/cron/daily`; allowed in dev when unset).

## Gotchas

- This repo lives on an external macOS/exFAT volume, so the tree is littered with `._*` AppleDouble sidecar files. They are git-ignored — **ignore them; never edit or commit them**.
- `db:push` is used instead of migrations; the `/drizzle` output dir is git-ignored.
- The file store auto-migrates old `db.json` files missing the `products` key by re-seeding (`migrate()` in `db-file.ts`). Delete `/.data/db.json` to fully reset local data.
