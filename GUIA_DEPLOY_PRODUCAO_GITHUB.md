# Guia: Subindo Modificações para Produção (GitHub → Hostinger)

> Baseado no processo real usado na equalização do módulo Financeiro (setembro/2026).
> Leia isso **antes** de qualquer `git push` para `main`.

## 1. Como funciona o deploy (entenda antes de mexer)

Produção (`btreeambiental.com`) é implantada por um **GitHub Actions**
(`.github/workflows/deploy-hostinger.yml`) que dispara **automaticamente a cada
push na branch `main`** — sem gate de staging, sem aprovação manual. O workflow:

1. Faz checkout do código.
2. Compila frontend (`vite build`) e backend (`esbuild`).
3. Conecta via SSH no servidor e roda `git pull origin main` na pasta
   `~/domains/btreeambiental.com/nodejs`.
4. Copia `dist/public/*` para `~/domains/btreeambiental.com/public_html`.
5. Reinicia o app Node (Passenger).

**Implicação prática**: assim que o push termina, em 1–3 minutos o código novo já
está no ar, atendendo usuários reais. Não existe "ambiente de homologação
automático" no meio do caminho — staging (zip manual) é uma etapa **separada e
opcional** que só existe se você mesmo fizer.

## 2. Checklist antes de dar push em `main`

- [ ] **Backup fresco no Hostinger** — hPanel → Sites → `btreeambiental.com` →
      Arquivos → Backups → aba "Restaurar e baixar" → gerar um backup novo de
      **arquivos** (pastas `nodejs` e `public_html`) e do **banco de dados**
      (`u629128033_btree_ambienta`). Anote a data/hora.
- [ ] `git fetch origin main` — confira se alguém empurrou algo novo direto na
      `main` enquanto você trabalhava (aconteceu nesta sessão: 2 commits novos
      apareceram no meio de um PR aberto).
- [ ] `npx tsc --noEmit` limpo.
- [ ] `npx vitest run` sem regressão nova (compare com o baseline: hoje há 4
      falhas pré-existentes de ambiente — token do Traccar e banco de teste
      ausentes no sandbox local — isso é esperado, não é uma regressão).
- [ ] Build completo local (`npx vite build` + `esbuild` do backend) sem erro.
- [ ] Levantar toda **migração manual pendente** (ver seção 4) e ter o SQL
      pronto para rodar em produção assim que o deploy terminar.

## 3. Fluxo de push — branch + PR vs. direto na `main`

**Prefira branch + Pull Request quando:**
- A mudança é grande, mescla trabalho de duas fontes diferentes, ou você quer
  revisar o diff consolidado antes de decidir.
- Fluxo: `git checkout -b minha-branch`, commit, `git push origin minha-branch`,
  abrir PR pela URL que o `git push` imprime, revisar, e só então clicar em
  **Merge pull request** (esse merge é que dispara o deploy).

**Pode ir direto na `main` quando:**
- É uma correção pequena, isolada, de causa já bem entendida (ex: um bug de
  cálculo em um único arquivo) e há urgência (produção já quebrada por uma
  causa que você identificou).
- Fluxo: commit na branch local, `git push origin minha-branch:main`.

Em ambos os casos, **sempre** rode o checklist da seção 2 antes.

### Se `git push` for rejeitado (non-fast-forward)

Significa que `main` andou desde a última vez que você sincronizou. Nunca use
`--force`. Em vez disso:
```bash
git fetch origin main
git merge origin/main   # ou rebase, se preferir
# resolva conflitos reais se houver (ver seção 5)
git push origin minha-branch:main
```

## 4. Migrações manuais — o maior risco deste projeto

O projeto tem **dois mecanismos de migração de banco**, e é fácil esquecer o
segundo:

1. **Automático**: `server/_core/index.ts` roda `CREATE TABLE IF NOT EXISTS` e
   `ALTER TABLE ... ADD COLUMN` (em `try/catch`, idempotente) toda vez que o
   app inicia. Cobre a maioria das tabelas novas.
2. **Manual**: vários arquivos soltos na raiz do repo (`migration_*.sql`,
   `fix_*.sql`, `MIGRATION_*.sql`) — cada um com um comentário do tipo
   *"Já aplicada no banco de staging. Rodar em produção quando for fazer o
   deploy desta mudança."* — **esses só rodam se alguém rodar manualmente.**
   Não existe garantia de que estejam cobertos pelo mecanismo automático.

### Como não ser pego de surpresa

Antes de fazer merge de uma mudança que adiciona colunas/tabelas novas:

```bash
# 1. Liste os arquivos de migração manual tocando as tabelas da sua mudança
grep -l "nome_da_tabela" migration_*.sql fix_*.sql MIGRATION_*.sql 2>/dev/null

# 2. Para cada um, confira se o ALTER/CREATE já está espelhado no mecanismo automático
grep -n "ALTER TABLE nome_da_tabela\|CREATE TABLE IF NOT EXISTS nome_da_tabela" server/_core/index.ts
```

Se não estiver no automático, **prepare o SQL idempotente antes do push**,
para rodar em produção assim que o deploy terminar (não deixe a tela quebrada
no ar entre o deploy e a correção manual). Padrão idempotente para uma coluna:

```sql
SET @c := (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='tabela' AND COLUMN_NAME='coluna');
SET @s := IF(@c=0, 'ALTER TABLE tabela ADD COLUMN coluna TIPO', 'SELECT 1');
PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
```

Evite `UNION ALL` dentro de um `INSERT ... SELECT ... ON DUPLICATE KEY UPDATE`
no editor SQL do phpMyAdmin — o realce de sintaxe dele se confunde. Prefira um
`INSERT` simples por linha, ou envolva o `UNION` numa subconsulta
(`SELECT * FROM (...) AS x`).

### Erros reais encontrados nesta sessão (para não repetir)

| Sintoma | Causa | Onde procurar da próxima vez |
|---|---|---|
| Tela em branco / "0 cadastrados" | Coluna nova faltando na tabela | `grep` o nome da coluna usada no router contra o schema real do banco |
| Comissão automática não calcula pra ninguém | Coluna `commission_auto` criada sem o `DEFAULT 1` pegar (ficou tudo em `0`) | Conferir o **valor real** das linhas depois de criar a coluna, não só se ela existe |
| Base de cálculo errada (R$ 0,00) | Código ainda lendo o campo antigo (`dailyRate`) em vez do novo (`monthlySalary`) | Ao introduzir um campo novo que *substitui* outro em algum fluxo, `grep` todos os usos do campo antigo no backend |
| Dados de configuração (tarifas, categorias) ausentes | Script de migração só cria a **estrutura**, não popula os **dados** (aquele `UPDATE ... WHERE name LIKE` específico) | Diferenciar, em cada `.sql`, o que é schema (idempotente, seguro repetir) do que é dado (rodar uma vez, com nomes reais) |

## 5. Se der conflito de merge

Se `origin/main` avançou com mudanças reais nos mesmos arquivos que você
alterou:

1. `git merge origin/main` (ou `git pull`).
2. Para cada arquivo em conflito, abra e entenda **os dois lados** antes de
   decidir — não aceite um lado inteiro por padrão. Em código com muita gente
   mexendo, é comum um lado ser um refactor que já superou o outro (nesse
   caso, mantenha o refactor e porte só o dado/funcionalidade nova do outro
   lado).
3. Depois de resolver: `npx tsc --noEmit`, build completo, `git add`, commit,
   push.
4. Nunca resolva um conflito só copiando um dos lados sem ler — o build passar
   não garante que a lógica ficou certa (só garante que compila).

## 6. Depois do deploy

- Espere 1–3 minutos (build + SSH + restart).
- Teste ao vivo em produção: login, e pelo menos uma tela de cada área tocada
  pela mudança.
- Rode qualquer migração manual pendente da seção 4 imediatamente — não deixe
  uma tela quebrada no ar entre o deploy e a correção.
- Se algo quebrar e não for uma correção rápida e óbvia: restaure pelo backup
  do Hostinger (arquivos **e** banco, mesmo horário) em vez de tentar
  "consertar pra frente" sob pressão.

## 7. Comandos de referência rápida

```bash
# Ver o que mudou em produção desde o seu último ponto de referência
git fetch origin main
git log <seu-ultimo-commit-conhecido>..origin/main --oneline

# Ver hunks de um arquivo específico (pra avaliar risco de conflito antes de mexer)
git diff <base> origin/main -- caminho/do/arquivo.ts | grep "^@@"

# Reverter produção pro commit anterior, se necessário (código apenas —
# não desfaz migrações de banco já aplicadas; combine com restore de backup
# do banco se a migração também precisar ser desfeita)
git reset --hard <commit-bom-anterior>
git push origin main   # sem --force costuma bastar se ninguém mais commitou depois
```

---
*Gerado a partir da sessão de equalização do módulo Financeiro — setembro/2026.*
