# HERMES-AGENT.md — El conector de Alibaba (Hermes + computer use)

**Hermes** es el agente que reemplazó a la vieja extensión de Chrome (Claude-en-Chrome)
como conector entre **Alibaba** y el brain de Mi Tiendita PR. Corre **local en la Mac**
con [Hermes Agent](https://hermes-agent.nousresearch.com) (Nous Research) y maneja tu
**Chrome real ya logueado** con el toolset **`computer_use`** (binario `cua-driver`),
sin extensión y sin copy-paste manual.

El playbook (fuente única) vive en [`lib/hermes-playbook.ts`](lib/hermes-playbook.ts) y
se renderiza en `/admin/operador`. La versión empaquetada como skill de Hermes está en
[`hermes/skills/mitiendita-alibaba/SKILL.md`](hermes/skills/mitiendita-alibaba/SKILL.md).
Detalle del sistema completo en [`OPERATIONS.md`](OPERATIONS.md).

> **Hermes es _stateless_**: su memoria es el brain de la página. Cada corrida empieza
> leyendo el brief (`GET /api/operator/brief?agent=hermes`).

---

## Arquitectura en una línea

```
Hermes (local, gpt-5.4-mini)
  ├─ browser (Browser Use) ──────▶ Alibaba anónimo ──▶ DESCUBRIR (rápido, sin login)
  ├─ computer_use (cua-driver) ──▶ Chrome REAL logueado ──▶ OUTREACH (mensajear suplidores)
  └─ terminal + curl ────────────▶ bus del operador (token):
         GET  /api/operator/brief?agent=hermes      (leer)
         POST /api/operator/ingest                  (depositar candidatos/suplidores/quotes)
         POST /api/operator/queue/<id>/done         (marcar outreach enviado)
```

**Tooling híbrido (por velocidad):** el **descubrimiento** usa el toolset `browser`
(DOM, rápido, anónimo — ver productos en Alibaba no requiere login). El **outreach**
(mensajear suplidores) sí necesita sesión, así que usa `computer_use` sobre tu Chrome real.

Por qué `computer_use` para el outreach y no el browser de Hermes: el browser por defecto
usa un navegador en la nube (sesión anónima) que no sirve para Alibaba logueado; y
adjuntarse por CDP a tu Chrome diario lo bloquea Chrome ≥136. `cua-driver` controla tu
Chrome real posteando eventos a esa ventana en segundo plano (no roba tu cursor) → reusa
tu login. El loop lento de screenshots se reserva solo para el outreach (bajo volumen).

---

## Setup (una sola vez)

### 1. Hermes Agent
Ya instalado (`hermes --version`). Si no:
```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
source ~/.zshrc
```

### 2. cua-driver (el computer use) + permisos
```bash
hermes computer-use install            # instala /Applications/CuaDriver.app + ~/.local/bin/cua-driver
cua-driver permissions grant           # lanza CuaDriver y pide Accesibilidad + Grabación de pantalla
cua-driver permissions status          # debe decir que el driver tiene ambos permisos
```
Concede **Accesibilidad** y **Grabación de pantalla** a *CuaDriver* en
Ajustes del Sistema → Privacidad y seguridad. El toolset `computer_use` debe estar
activo (`hermes /toolsets` → `(*) computer_use`).

### 3. Login de Alibaba (¡importante!)
Loguéate en **alibaba.com** en tu Chrome diario **una vez**. Hermes opera esa sesión;
si expira, vuelve a loguearte. (Sin login no puede mensajear suplidores ni ver contactos.)

### 4. Token del bus + URL base
El bus está gateado por `OPERATOR_INGEST_TOKEN` (el mismo valor que en Vercel → Env Vars).
Ponlo, junto con la URL base, en `~/.hermes/.env`:
```
OPERATOR_INGEST_TOKEN=<el-mismo-token-de-Vercel>
MT_BASE_URL=https://www.mitienditapr.net
```
Y reenvíalos al subproceso de terminal (en `~/.hermes/config.yaml`):
```yaml
terminal:
  env_passthrough: [OPERATOR_INGEST_TOKEN, MT_BASE_URL]
```

### 5. Instalar la skill
```bash
# desde la raíz del repo:
mkdir -p ~/.hermes/skills/mitiendita-alibaba
cp -R hermes/skills/mitiendita-alibaba/. ~/.hermes/skills/mitiendita-alibaba/
hermes skills list | grep mitiendita-alibaba
```

---

## Correr

**Manual (supervisado):**
```bash
hermes -z "Corre el conector de Alibaba de Mi Tiendita PR (skill mitiendita-alibaba)." \
  --skill mitiendita-alibaba -t terminal,browser,computer_use --yolo
```
> Los tres toolsets: `terminal` (curl al bus), `browser` (descubrir, rápido) y
> `computer_use` (outreach sobre tu Chrome logueado). Para la cron, asegúrate de que estén
> habilitados en tu perfil (`hermes /toolsets`).

**Desatendido (cron):**
```bash
hermes cron create "0 9 * * *" \
  "Corre el conector de Alibaba de Mi Tiendita PR." \
  --name mitiendita-alibaba --skill mitiendita-alibaba \
  --workdir "$(pwd)"
hermes cron list
hermes cron run mitiendita-alibaba   # forzar una corrida en el próximo tick
```

---

## El loop (leer → actuar → depositar → marcar)

1. **Leer** — `GET /brief?agent=hermes`: identidad, reglas/gates, parámetros de sourcing,
   lo ya conocido (no dupliques), la cola aprobada y las decisiones recientes.
2. **Actuar** — outreach de la cola con `computer_use` (Chrome logueado); descubrir
   candidatos con el toolset `browser` (rápido, anónimo).
3. **Depositar** — `POST /ingest` con `{ candidates, suppliers, quotes }`.
4. **Marcar** — `POST /queue/<id>/done` por cada outreach enviado.

### Navegación confiable con `computer_use` (lección de las pruebas — solo para outreach)
`focus_app` Chrome → `cmd+t` → `capture(mode='som')` → **click al omnibox por índice** →
escribe la URL → `return` → `wait ~4s` → `capture` y **verifica el título** antes de actuar.
Escribir `cmd+L` "a ciegas" no enfoca el omnibox de forma confiable. (El descubrimiento usa
el toolset `browser`, que es DOM y no tiene este problema.)

---

## Reglas de oro (guardrails)
- `sourceUrl` **obligatorio** en cada candidato (enlace directo al producto, no a la búsqueda).
- Empieza SIEMPRE por el brief (Hermes no tiene memoria).
- Gates de dinero/contacto/publicación son de Miguel: Hermes propone, él aprueba en `/admin/aprobaciones`.
- No contactes suplidores fuera de la cola aprobada.
- Surtido: nada de belleza/bienestar/skincare/suplementos/salud.
- Nunca menciones automatización/IA en nada público. Los estimados son estimados.

---

## Alternativa sin Hermes (pegado manual)
`/admin/operador` sigue funcionando con la cookie de admin: puedes leer el brief y pegar
hallazgos a mano (origen `hermes`). Útil para depurar el brain sin correr el agente.
