# Guia: Subindo Modificações para Produção (GitHub → VPS Hostinger)

> Substitui `GUIA_DEPLOY_PRODUCAO_GITHUB.md` (descrevia o fluxo antigo de
> Hostinger compartilhada + GitHub Actions, **desativado**). Baseado no
> processo real mapeado e usado na equalização de setembro/2026 (módulo
> Financeiro + Estoque + áreas do cliente).
>
> Leia isso **antes** de qualquer deploy em produção.

## 1. Como a produção funciona hoje (entenda antes de mexer)

Produção (`btreeambiental.com`) roda numa **VPS Hostinger**, não mais na
hospedagem compartilhada. Fatos confirmados por SSH (não presuma, reconfirme
se passar muito tempo sem mexer nisso):

- App na pasta `/root/btree_ambiental` (um clone git normal, branch `main`).
- Processo gerenciado por **PM2**: `pm2 show btree` → `script path:
  /root/btree_ambiental/dist/index.js`, modo `cluster_mode`.
- Banco de dados: **`u629128033_btree_ambienta`** (repare: truncado, sem o "l"
  final — é diferente do banco de staging, `u629128033_btree_staging`).
  Confira sempre qual banco cada ambiente usa antes de rodar qualquer coisa.
- **Não existe deploy automático.** Não há crontab (checado em todos os
  usuários do sistema), git hook, timer systemd, nem sessão screen/tmux
  monitorando. O comentário em `.github/workflows/deploy-vps.yml` ("a VPS
  consulta origin/main a cada 2 min") **não está implementado** — o próprio
  arquivo diz isso ("não disparar SSH... enquanto não tiver sido validado").
  **Todo deploy é manual, por SSH.**
- `dist/` é **commitado no repositório** (mesmo padrão do fluxo antigo) — o
  build acontece na sua máquina, não na VPS. `git pull` na VPS já traz o
  `dist/` pronto; só precisa reiniciar o PM2.
- Não tem Passenger nem Apache na frente (isso só existe no **staging**,
  hospedagem compartilhada — ver `GUIA_DEPLOY_STAGING_HOSTINGER.md` pro
  defeito específico de lá, que **não se aplica** à VPS).

## 2. Checklist antes de abrir o PR

- [ ] `git fetch origin main` — confira se `main` andou desde seu último
      ponto de referência (`git log <seu-ultimo-commit-conhecido>..origin/main --oneline`).
- [ ] **Backup do código**: crie uma branch apontando pro `main` atual antes
      de mexer, ex:
      ```bash
      git branch backup/antes-<descricao>-$(date +%Y%m%d) origin/main
      git push origin backup/antes-<descricao>-$(date +%Y%m%d)
      ```
      Isso não precisa de acesso à VPS — é só GitHub. Dá pra restaurar depois
      com `git push origin backup/antes-...:main` (sem `--force`, só funciona
      se `main` não tiver avançado mais desde então).
- [ ] **Backup do banco de produção** — via SSH na VPS:
      ```bash
      mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > ~/backup_prod_$(date +%Y%m%d_%H%M).sql.gz
      ```
      (use as variáveis do `.env` da própria VPS — nunca cole a senha na
      linha de comando em texto puro se puder evitar; ou leia do `.env` com
      `set -a; source .env; set +a` antes do `mysqldump`.) Baixe esse arquivo
      pra fora da VPS antes de continuar.
- [ ] `npx tsc --noEmit` limpo.
- [ ] `npx vitest run` sem regressão nova. **Baseline conhecido**: ~23 testes
      falham por falta de banco/env no sandbox local (`DB indisponível`,
      `TRACCAR_TOKEN` ausente) — o `vitest.config.ts` não carrega o `.env`.
      Isso é normal, não é regressão; compare só os testes relacionados à sua
      mudança.
- [ ] Build completo local (`npx vite build` + o `esbuild` do backend) sem
      erro — é esse `dist/` que vai pro commit.
- [ ] Levantar toda **migração manual pendente** (ver seção 4).

## 3. Branch, PR e merge

1. `git checkout -b feat/minha-mudanca`, commitar (incluindo o `dist/`
   atualizado), `git push origin feat/minha-mudanca`.
2. Abrir PR contra `main` pela URL que o push imprime. Se a mudança mexer em
   algo que outra pessoa também desenvolve (ex: módulo de outro dev), marcar
   isso na descrição do PR mesmo que não bloqueie o merge.
3. Merge do PR no GitHub. **Isso sozinho não muda nada em produção** — ver
   seção 4.

## 4. Deploy manual na VPS

Depois do merge, por SSH:

```bash
cd /root/btree_ambiental
git pull origin main
```

Se o `git pull` trouxe mudança em `dist/index.js` (o normal), reinicie sem
downtime (app está em `cluster_mode`):

```bash
pm2 reload btree
```

Só use `pm2 restart btree` se `reload` não pegar a mudança (restart derruba
e sobe de novo, com uma janela curta de indisponibilidade).

### Migrações de banco — duas categorias

1. **Automáticas** (`server/_core/index.ts`, `CREATE TABLE IF NOT EXISTS` /
   `ALTER TABLE ... ADD COLUMN` em `try/catch`, todas idempotentes): rodam
   sozinhas no boot seguinte ao `pm2 reload`. Protegidas por uma **trava de
   6 horas** (`MIGRATION_MARK` em `/tmp/btree_last_migration`) — existe
   porque migração a cada boot já causou acúmulo de processos e derrubou a
   Hostinger compartilhada antes. Se você reiniciar o PM2 duas vezes seguidas
   em menos de 6h, a segunda vez **não** roda migração nova — se uma tela
   nova parecer quebrada logo após o deploy, apague o arquivo
   `/tmp/btree_last_migration` na VPS e reinicie de novo antes de suspeitar
   de outra causa.
2. **Manuais** (scripts soltos em `scripts/*.mjs`, um por mudança estrutural
   grande — ex: `migrate-client-areas.mjs`, `migrate-equipment-trailer-plate.mjs`):
   **não rodam sozinhos nunca**. Antes de fazer o PR, confira se sua mudança
   introduziu um desses scripts. Se sim, depois do `git pull` na VPS:
   ```bash
   node scripts/nome-do-script.mjs inspect   # sempre primeiro, só leitura
   node scripts/nome-do-script.mjs migrate   # ou "apply", varia por script
   ```
   Cada um faz backup automático das tabelas que toca (normalmente em
   `/root/btree-backups/...` — confira o cabeçalho do próprio script pra
   saber o caminho exato e o modo certo).
3. Há também migrações **preguiçosas** dentro de routers específicos (ex:
   `ensurePayrollTable()` em `server/routers/payroll.ts`) que só rodam quando
   a tela correspondente é acessada pela primeira vez, não no boot. Se uma
   coluna nova dessas não aparecer logo após o deploy, não é bug — abra a
   tela relacionada (nesse exemplo, Folha de Pagamento) pra ela se criar.

**Ordem de risco**: se seu PR trouxe tabelas que o código já espera desde o
primeiro boot, existe uma janela entre "código novo no ar" e "migração manual
rodada" em que a tela pode ficar com uma falha silenciosa (lista vazia, sem
erro visível). Tenha os comandos da migração manual prontos pra colar assim
que o `pm2 reload` terminar.

## 5. Verificar depois do deploy

```bash
git log --oneline -1                          # deve mostrar o commit do merge
pm2 show btree | grep -E "uptime|restarts"    # uptime baixo = acabou de reiniciar
pm2 logs btree --lines 60 --nostream | grep -i "AutoMigration\|error"
```

Procure `[AutoMigration] Tables verified/created successfully` no fim do log.
Erros do tipo "coluna já existe" (`fuel_invoices`, `fiscal_note_id` etc.) são
normais e não indicam problema.

Depois, testar ao vivo em `btreeambiental.com`: login e pelo menos uma tela de
cada área tocada pela mudança.

## 6. Se der errado

- **Reverter código**: `git revert` do commit de merge no `main`, novo push
  (nunca `--force`); depois repetir a seção 4 (`git pull` + `pm2 reload`) na
  VPS pra aplicar a reversão.
- **Reverter dados**: restaurar pelo backup da seção 2 (`mysqldump`) ou pelos
  `.json.gz`/`.json` que os scripts de migração manual geram.
- Não tente "consertar pra frente" sob pressão em produção — reverta e
  investigue com calma depois.

## 7. Pegadinhas conhecidas (não redescobrir toda vez)

- **Banco de produção ≠ banco de staging** — nomes parecidos
  (`u629128033_btree_ambienta` vs `u629128033_btree_staging`), fácil de
  confundir. Sempre confira qual `.env`/qual ambiente antes de rodar SQL.
- **Sem deploy automático** — apesar do que `deploy-vps.yml` sugere. Todo
  deploy exige alguém logar via SSH.
- **Trava de 6h de migração** — ver seção 4.1.
- **Defeito do Passenger/`hbuilds/config`** (staging apenas): a Hostinger
  recria `hbuilds/config/package.json` com `"type":"module"` a cada
  implantação, quebrando os scripts internos dela (`exit-safely.js`) e
  derrubando o app com 503, sem log. **Só acontece no staging** (painel de
  App Node.js / Passenger da hospedagem compartilhada) — a VPS não usa esse
  mecanismo. Se aparecer um 503 sem log nenhum no staging, é isso; ver
  `GUIA_DEPLOY_STAGING_HOSTINGER.md`.
- **Webhook do WhatsApp é um só por app/número no Meta** — se staging e
  produção compartilham o mesmo número (`META_WA_PHONE_ID`), só um dos dois
  recebe mensagens reais por vez (o que estiver cadastrado em
  developers.facebook.com → app → WhatsApp → Configuração → Webhook). Pra
  testar em staging sem afetar produção, use o número de teste gratuito do
  Meta com webhook próprio, em vez de trocar a URL do número real toda hora.
- **API do Sicoob às vezes dá `ECONNRESET`** — instabilidade de rede da API
  deles, não do nosso código; a sincronização normalmente funciona na
  tentativa seguinte. Só investigar mais se ficar falhando repetidamente.
- Variáveis de ambiente novas de uma feature (ex: `WHATSAPP_APP_SECRET`,
  `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `WHATSAPP_TEMPLATE_*`) **não** são
  migradas junto com o código — sempre conferir se a VPS de produção já tem
  todas as chaves que a sua mudança introduziu no `.env` local antes de
  assumir que a feature vai funcionar lá.

---
*Atualizado a partir da sessão de equalização de setembro/2026 (Estoque,
Compras/WhatsApp, Contas a Receber, Folha, áreas do cliente).*
