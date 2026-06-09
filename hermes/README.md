# hermes/ — config del agente Hermes (conector de Alibaba)

Esta carpeta versiona lo necesario para correr **Hermes** (el agente de computer use que
reemplazó la extensión de Chrome) contra el bus del operador. El setup narrado completo
—instalación, permisos de macOS, login de Alibaba, token— está en
[`../HERMES-AGENT.md`](../HERMES-AGENT.md).

## Contenido
- `skills/mitiendita-alibaba/SKILL.md` — la skill: el loop leer → actuar → depositar → marcar.
  Es el mismo playbook de [`../lib/hermes-playbook.ts`](../lib/hermes-playbook.ts) (mantenlos
  alineados; ese .ts es lo que muestra `/admin/operador`).
- `config.example.yaml` — fragmento para `~/.hermes/config.yaml` (`env_passthrough` + notas).

## Instalar (resumen)
```bash
# 1) skill
mkdir -p ~/.hermes/skills/mitiendita-alibaba
cp -R hermes/skills/mitiendita-alibaba/. ~/.hermes/skills/mitiendita-alibaba/

# 2) secretos en ~/.hermes/.env
#    OPERATOR_INGEST_TOKEN=<el-mismo-de-Vercel>
#    MT_BASE_URL=https://www.mitienditapr.net

# 3) reenvío de env (mezcla config.example.yaml en ~/.hermes/config.yaml)

# 4) correr
hermes -z "Corre la skill mitiendita-alibaba." --skill mitiendita-alibaba -t terminal,browser,computer_use --yolo
#    o agendar:
hermes cron create "0 9 * * *" "Corre el conector de Alibaba." --name mitiendita-alibaba --skill mitiendita-alibaba --workdir "$(pwd)"
```
