# Mi Tiendita PR 🛒🇵🇷

Tienda **B2C + B2B** de productos importados, virales y de alta utilidad para
**individuos, gasolineras, farmacias y mini-markets** en Puerto Rico. La operación
interna está automatizada de punta a punta (sourcing → catálogo → marketing).

> Nota interna: la automatización es ventaja operativa y **no se comunica de cara al
> cliente**. Nada en la web pública la menciona.

- **B2C:** catálogo público con precios al detal y carrito.
- **B2B:** los negocios crean cuenta con su **Registro de Comerciante**. Tras la
  verificación, se desbloquean **precios al por mayor** en todo el catálogo.
- **Panel de operación (interno, con contraseña):** verificación de negocios,
  pipeline de sourcing (Alibaba) y generador de copy de marketing.

---

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack) + **React 19**
- **TypeScript** estricto
- **Tailwind CSS v4** con design tokens propios (estética tropical-moderna boricua)
- **Vercel AI SDK** (`ai`) vía AI Gateway — con fallback local sin API key
- Persistencia MVP: archivo JSON en `/.data` (interfaz lista para cambiar a Postgres/Neon)
- Sesiones: cookie firmada (HMAC) — sin dependencias externas

## Correr local

```bash
npm install
npm run dev      # http://localhost:3000
```

Build de producción:

```bash
npm run build && npm start
```

## Cuentas demo

| Rol | Acceso |
|-----|--------|
| Negocio verificado (ve precios mayoristas) | `demo@gasolinera.pr` / `demo1234` |
| Negocio pendiente (aparece en el panel admin) | `farmacia@salud.pr` / `salud1234` |
| Panel de operación (interno) | `/admin` · contraseña **`admin`** |

> El store se siembra solo la primera vez en `/.data/db.json`. Bórralo para resetear.

## Base de datos (Neon Postgres)

La capa de datos es **conmutable** (`lib/db.ts`):

- **Sin `DATABASE_URL`** → usa el archivo local `/.data/db.json` (dev, cero setup).
- **Con `DATABASE_URL`** → usa **Postgres/Neon** vía Drizzle (`lib/db-postgres.ts`).

El resto de la app no cambia: ambos adaptadores comparten el mismo contrato async.

### Conectar Neon (paso a paso)

1. **Crea la base de datos.** En [Vercel](https://vercel.com) → tu proyecto →
   pestaña **Storage** → **Create Database** → **Neon (Postgres)**. (O créala en
   [neon.tech](https://neon.tech) y copia la connection string.)
2. **Copia la connection string** (formato
   `postgresql://USER:PASS@HOST/DB?sslmode=require`).
3. **Ponla en `.env`** en la raíz del proyecto:
   ```bash
   DATABASE_URL="postgresql://...?sslmode=require"
   ```
4. **Crea las tablas** (lee el schema y lo aplica directo, sin migraciones):
   ```bash
   npm run db:push
   ```
5. **Siembra** productos y cuentas demo:
   ```bash
   npm run db:seed
   ```
6. **Corre la app** — ya está usando Postgres:
   ```bash
   npm run dev
   ```

En Vercel (deploy), añade `DATABASE_URL` en **Settings → Environment Variables**
(la integración de Neon del Marketplace la inyecta sola).

### Comandos de base de datos

| Comando | Qué hace |
|---------|----------|
| `npm run db:push` | Sincroniza el schema (`lib/schema.ts`) con la base de datos |
| `npm run db:seed` | Inserta productos semilla + cuentas demo (idempotente) |
| `npm run db:studio` | Abre Drizzle Studio para ver/editar datos |

> Schema en `lib/schema.ts` · cliente en `lib/drizzle.ts` · queries en `lib/db-postgres.ts`.

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Home / storefront |
| `/productos` · `/productos/[slug]` | Catálogo y detalle (precio según sesión) |
| `/exclusivo/[slug]` · `/exclusivo/gracias` | Link cerrado: un solo producto + checkout contenido (sin navegación al resto de la tienda) |
| `/carrito` · `/carrito/gracias` | Carrito y confirmación |
| `/para-negocios` | Propuesta B2B + cómo funciona la verificación |
| `/negocios/registro` · `/negocios/entrar` · `/negocios/cuenta` | Flujo B2B |
| `/admin` | Panel de operación (interno, con contraseña) |
| `/admin/productos` | Dashboard de productos (listar, ocultar, eliminar) |
| `/admin/productos/nuevo` · `/admin/productos/[id]` | Crear / editar producto |

## Gestión de productos (admin)

Los productos viven en el store (`/.data/db.json`, sembrado desde
`lib/products.ts → SEED_PRODUCTS`) y se gestionan 100 % desde
`/admin/productos`. Cada producto maneja: nombre, slug, emoji, imagen (fondo),
**categoría**, **colección**, frase, descripción, **precio al detal**,
**descuento %**, **precio mayorista**, mínimo mayorista, caja máster,
**costo de envío**, costo importado, inventario, badges, segmentos, etiquetas y
**visibilidad** en la tienda.

- El **descuento %** aplica al precio al detal (B2C) y se ve tachado en tienda.
- El **envío** del pedido = el más alto entre los productos del carrito.
- Ocultar un producto (toggle "Visible/Oculto") lo saca de la tienda pública sin borrarlo.
- Migración automática: si el `db.json` existía sin productos, se siembra al primer acceso.

### Links cerrados (venta rápida)

Para vender un producto sin mandar al cliente al catálogo completo, usa un **link
cerrado**:

1. En `/admin/productos` (lista) o al editar un producto, pulsa **🔒 Link cerrado**.
2. Se abre un preview con la URL (`/exclusivo/<slug>`), el nombre del producto y
   botones para **copiar** o **abrir en nueva pestaña**.
3. Envía ese enlace por WhatsApp, SMS, email o redes.

**Qué ve el cliente:** solo ese producto (fotos, descripción, precio y compra
directa con Stripe). No hay header, footer, asistente ni links al resto de la
tienda. La confirmación también es cerrada (`/exclusivo/gracias`).

**Notas:**

- El producto debe estar **visible** (activo); si está oculto, el link devuelve 404.
- La página lleva `noindex` para que no aparezca en buscadores.
- No bloquea otras URLs del sitio — solo oculta la navegación en esa experiencia.
- Si un negocio verificado entra con su sesión, verá precio mayorista en ese link.

## Cómo funciona el gating de precios

`lib/auth.ts` lee la cookie de sesión y resuelve el negocio. Si su estado es
`verified`, todas las vistas (`/`, `/productos`, detalle, carrito) muestran
`product.wholesale` con su mínimo de compra; de lo contrario muestran
`product.retail` y una invitación a registrarse.

## AI (opcional)

El generador de copy (`lib/ai.ts`) usa el **Vercel AI Gateway** si existe
`AI_GATEWAY_API_KEY`; si no, usa una plantilla local determinista, así que la app
funciona sin ninguna key. Copia `.env.example` a `.env` para configurar.

## Variables de entorno

Ver `.env.example`: `SESSION_SECRET`, `ADMIN_PASSWORD`, `AI_GATEWAY_API_KEY`.

---

## Camino a producción

Esto es un MVP funcional. Próximos pasos sugeridos:

1. **Base de datos real:** cambiar `lib/db.ts` por **Neon Postgres** (Vercel
   Marketplace). Las firmas de funciones ya son el contrato a respetar.
2. **Auth robusta:** **Clerk** (Marketplace) para negocios; mantener el rol
   admin separado.
3. **Verificación real del Registro de Comerciante:** integrar validación con
   Hacienda PR (o revisión manual asistida por AI en el panel).
4. **Pagos:** Stripe/ATH Móvil en el checkout.
5. **Sourcing automatizado:** agentes que rastrean tendencias + API/scraping de
   Alibaba alimentando el pipeline de `lib/sourcing.ts`.
6. **Marketing automático:** generación de imágenes/campañas y publicación
   programada en redes.
7. **Deploy:** `vercel` (preview) → producción.
