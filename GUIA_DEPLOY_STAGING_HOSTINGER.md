# Guia: Deploy para Staging na Hostinger

Passo a passo para subir uma nova versão do sistema para o ambiente de
**staging** (`staging.btreeambiental.com`) na Hostinger, via upload manual de
`.zip`, sem tocar em nada do ambiente de **produção** (`btreeambiental.com`).

> ⚠️ **Este processo é só para staging.** Produção é atualizada
> automaticamente pelo GitHub Actions (`.github/workflows/deploy-hostinger.yml`)
> a cada push na branch `principal`. Nunca use este zip nem este guia na
> tela de Implantações do app de produção.

---

## Por que isso é seguro (não afeta produção)

- O pacote `.zip` não contém `.env`, `.git/`, `node_modules/` nem o workflow
  do GitHub Actions — só código-fonte e o build já compilado.
- A tela de **Implantações** da Hostinger é isolada por site: o upload,
  extração e build rodam só dentro da árvore de arquivos do site selecionado
  no dropdown (confirmamos isso comparando as pastas de produção e staging —
  cada uma tem seu próprio hash/raiz no sistema de arquivos).
- O `build.sh` do repositório **não tem nenhum caminho fixo com o domínio de
  produção**. A única etapa que escreve em disco (cópia de assets estáticos
  para `public_html`) só age se encontrar uma pasta `public_html` **um nível
  acima** de onde o script está rodando — que, pela estrutura da Hostinger,
  é sempre a `public_html` do próprio site, nunca de outro.
- O backend compilado (`dist/index.js`) não tem nenhuma chamada de escrita ou
  exclusão de arquivo (`fs.writeFile`, `fs.unlink`, `fs.rm`, etc.) — ele só
  fala com o banco de dados e com APIs externas.

---

## Passo 1 — Gerar o pacote `.zip`

Na raiz do projeto, no PowerShell:

```powershell
.\scripts\build-staging-package.ps1
```

Esse script faz tudo automaticamente:
1. Compila o frontend (`vite build`) e o backend (`esbuild`) com o código atual
2. Corrige a quebra de linha do `build.sh` para `LF` (evita o erro de sintaxe
   bash — veja a seção de Troubleshooting)
3. Monta um pacote só com o necessário (sem `node_modules`, `.git`, `.env`)
4. Compacta em `.zip` com caminhos corretos (`/`, não `\` — veja Troubleshooting)
5. Salva em `Downloads\btree_staging_deploy_AAAAMMDD_HHMM.zip`

No final ele imprime o caminho exato do arquivo gerado. É esse arquivo que
você vai enviar no Passo 3.

### Alternativa manual (se o script não rodar por algum motivo)

```powershell
npx vite build
npx esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js
```

Depois monte manualmente uma pasta só com: `build.sh`, `package.json`,
`package.hostinger.json`, `client/` (**sem** `client/dist`, que é artefato
legado), `server/`, `drizzle/`, `dist/`. Compacte com
`System.IO.Compression` (não use `Compress-Archive` — ver Troubleshooting).

---

## Passo 2 — Conferência rápida (opcional, mas recomendado)

Antes de subir, vale confirmar que o zip está limpo:

```powershell
# Não deve haver .env, .git ou node_modules no pacote
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead("CAMINHO_DO_ZIP")
$zip.Entries | Where-Object { $_.FullName -match "\.env$|\.git/|node_modules" }
$zip.Dispose()
```

Se não retornar nada, está correto.

---

## Passo 3 — Upload na Hostinger

1. Acesse o **hPanel** da Hostinger
2. No topo, confirme que o site selecionado é **`staging.btreeambiental.com`**
   (não o de produção!)
3. Menu lateral → **Implantações**
4. Marque **"Carregar novos arquivos"**
5. Selecione o `.zip` gerado no Passo 1
6. Confira os campos de configuração (normalmente já vêm preenchidos):
   - **Configuração predefinida:** Express
   - **Versão do Node:** 22.x
   - **Diretório raiz:** `./`
   - **Gerenciador de pacotes:** npm
   - **Arquivo de entrada:** `dist/index.js`
7. Confirme/dispare a implantação

---

## ⚠️ Importante: onde o app realmente roda (não é a pasta `nodejs/` do Gerenciador de Arquivos)

A tela de **Implantações** usa um sistema de build **versionado**: a cada
deploy, a Hostinger extrai o zip numa pasta **nova**, com um UUID diferente
a cada vez:

```
~/domains/staging.btreeambiental.com/hbuilds/versions/<uuid-novo>/nodejs/
```

Essa pasta é o `cwd` real do processo Node em execução — **não** é a mesma
pasta `nodejs/` que aparece na raiz do site no Gerenciador de Arquivos
(aquela é uma pasta estática, separada, que os deploys versionados não tocam).

**Por que isso importa:** qualquer caminho *relativo* que você configurar
numa variável de ambiente (ex: `./certs/...`) é resolvido a partir dessa
pasta versionada — que muda de UUID a cada deploy. Um arquivo que você subiu
manualmente pela pasta estática `nodejs/` (pelo Gerenciador de Arquivos)
**nunca** vai ser encontrado por um caminho relativo, porque literalmente
não está na árvore onde o app está rodando.

**A solução:** para qualquer arquivo que precise ficar disponível pro app
(como o certificado `.pfx` do Sicoob) e que **não venha dentro do zip** de
deploy, use o **caminho absoluto** da pasta estática `nodejs/` (essa sim é
estável entre deploys), em vez de um caminho relativo. Veja o Passo 4.

---

## Passo 4 — Conferir as variáveis de ambiente

Na mesma tela de configuração do app (seção **Variáveis de ambiente**),
confirme que estão todas presentes. Se for a primeira vez configurando esse
app, adicione as que estiverem faltando — copie os valores do `.env` local
do projeto (exceto onde indicado):

**Banco de dados, básicas:**
`NODE_ENV=production`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

**Integrações já existentes:** `TRACCAR_TOKEN`, `TRACCAR_URL`,
`META_WA_PHONE_ID`, `META_WA_TOKEN`, `APP_BASE_URL`

**Sicoob:**
`SICOOB_CLIENT_ID`, `SICOOB_NUMERO_CLIENTE`, `SICOOB_NUMERO_CONTA`,
`SICOOB_CODIGO_MODALIDADE`, `SICOOB_CERT_PASSPHRASE`

**Conta Azul:**
`CONTAAZUL_CLIENT_ID`, `CONTAAZUL_CLIENT_SECRET`

> ⚠️ **`SICOOB_CERT_PATH` é especial — use caminho ABSOLUTO, não relativo.**
> O valor do `.env` local aponta para um caminho do Windows — isso não existe
> no servidor. Você precisa:
> 1. Enviar o arquivo `.pfx` do certificado Sicoob pelo **Gerenciador de
>    Arquivos** para dentro da pasta estática `nodejs/certs/` **na raiz do
>    site** (não dentro de nenhuma pasta versionada — veja o aviso acima)
> 2. Definir `SICOOB_CERT_PATH` com o **caminho absoluto completo**, por
>    exemplo:
>    ```
>    /home/u629128033/domains/staging.btreeambiental.com/nodejs/certs/NOME-DO-ARQUIVO.pfx
>    ```
>    **Não use `./certs/...`** — um caminho relativo é resolvido a partir da
>    pasta versionada do deploy (que muda a cada vez), então nunca vai achar
>    o arquivo. O caminho absoluto da pasta estática, por outro lado, se
>    mantém válido em todos os deploys futuros — configure uma vez só.

> ℹ️ O `refresh_token` da Conta Azul **não** é uma variável de ambiente — ele
> fica salvo no banco de dados. Configure-o pela própria tela do sistema
> (Contas a Receber → Notas Fiscais → Configurar) depois do primeiro deploy,
> já que staging usa um banco separado do de produção.

---

## Passo 5 — Verificar depois do deploy

1. Acesse `https://staging.btreeambiental.com`
2. Teste uma rota de SPA diretamente pela URL, por exemplo
   `https://staging.btreeambiental.com/login` — se der **403 Forbidden**,
   os assets estáticos não foram copiados para `public_html` corretamente
   (veja Troubleshooting)
3. Faça login e navegue por uma das telas alteradas recentemente pra
   confirmar que o código novo está no ar

---

## Passo 6 (opcional) — Sincronizar dados de produção para staging

Se o staging estiver com dados velhos/de teste e você quiser trabalhar em
cima de dados reais, dá pra copiar só os **dados** das tabelas que já
existem nos dois bancos — **sem tocar** nas tabelas novas do módulo
financeiro (Sicoob/Conta Azul, que só existem no staging) e **sem escrever
nada em produção** (o processo só lê de lá).

> ⚠️ Isso apaga (`TRUNCATE`) os dados atuais do staging nas tabelas afetadas
> antes de importar os de produção. Se tiver algo de teste que queira manter
> no staging, salve antes de rodar.

### ❌ Não use o Exportar/Importar do phpMyAdmin para isso

Já tentamos — a exportação "Personalizada" do phpMyAdmin nesse servidor tem
um bug sistêmico: ao tentar ler os dados de **todas** as tabelas pra
exportar, gera erro de sintaxe (`#1064 ... próximo a 'FROM'`) e o dump sai
vazio (só comentários de erro no lugar dos `INSERT`s), mesmo desmarcando
Estrutura/Rotinas/Views/Triggers corretamente. Não perca tempo tentando essa
via — vá direto para o método com `mysqldump` via SSH abaixo, que funciona.

### Pré-requisito: acesso SSH via chave (não a senha compartilhada)

A senha SSH da conta é compartilhada com outro desenvolvedor — **nunca
altere essa senha**, isso quebraria o acesso dele. Em vez disso, uma chave
SSH própria já foi configurada (adicional, não substitui a senha):

- Chave privada local: `C:\Users\eduar\.ssh\btree_hostinger_staging`
- Chave pública já cadastrada no hPanel (Avançado → Acesso SSH → Chaves SSH)
- Testar conexão:
  ```bash
  ssh -o BatchMode=yes -i "C:\Users\eduar\.ssh\btree_hostinger_staging" -p 65002 u629128033@212.1.211.65 "echo OK"
  ```

Se precisar gerar uma chave nova (ex: em outra máquina), rode
`ssh-keygen -t ed25519 -f CAMINHO -N '""'` e adicione o conteúdo do
`.pub` gerado na mesma tela do hPanel — isso nunca mexe na senha existente.

### Como executar (rodando os comandos localmente, via SSH remoto — sem precisar copiar arquivo pro servidor)

Credenciais dos bancos (Hostinger → Bancos de dados → MySQL Databases, um
em cada site):

- Produção: banco `u629128033_btree_ambienta`, usuário `u629128033_btree`
- Staging: banco `u629128033_btree_staging`, usuário `u629128033_btree_staging`

**1. Dump de produção (só leitura, nunca escreve lá):**

```bash
ssh -i "C:\Users\eduar\.ssh\btree_hostinger_staging" -p 65002 u629128033@212.1.211.65 '
DUMP_FILE="/tmp/prod_data_dump_$(date +%Y%m%d_%H%M%S).sql"
echo "$DUMP_FILE" > /tmp/last_dump_path.txt
mysqldump -h srv572.hstgr.io -u u629128033_btree -pSENHA_PRODUCAO u629128033_btree_ambienta \
  --no-create-info --single-transaction --quick --add-locks=0 --disable-keys \
  --ignore-table=u629128033_btree_ambienta.sicoob_boletos \
  --ignore-table=u629128033_btree_ambienta.sicoob_extrato \
  --ignore-table=u629128033_btree_ambienta.sicoob_saldo_mes \
  --ignore-table=u629128033_btree_ambienta.sicoob_lancamentos_futuros \
  --ignore-table=u629128033_btree_ambienta.categorias_financeiras \
  --ignore-table=u629128033_btree_ambienta.contaazul_tokens \
  --ignore-table=u629128033_btree_ambienta.notas_fiscais \
  --ignore-table=u629128033_btree_ambienta.notas_fiscais_status_log \
  --ignore-table=u629128033_btree_ambienta.cliente_prazo_pagamento \
  --ignore-table=u629128033_btree_ambienta.favorecido_categoria \
  > "$DUMP_FILE"
ls -lh "$DUMP_FILE"
grep -oE "^INSERT INTO \`[a-zA-Z0-9_]+\`" "$DUMP_FILE" | sed -E "s/^INSERT INTO \`//; s/\`\$//" | sort -u
'
```

> ⚠️ **Não use a flag `--set-gtid-purged=OFF`** — a versão do `mysqldump`
> nesse servidor não reconhece essa flag (`unknown variable`) e o dump falha
> silenciosamente, gerando um arquivo vazio de 0 bytes. Já removida do
> comando acima.

Confira a lista de tabelas impressa no final — são as que serão
sobrescritas no staging.

**2. Truncar as tabelas correspondentes no staging + importar:**

```bash
ssh -i "C:\Users\eduar\.ssh\btree_hostinger_staging" -p 65002 u629128033@212.1.211.65 '
DUMP_FILE=$(cat /tmp/last_dump_path.txt)
grep -oE "^INSERT INTO \`[a-zA-Z0-9_]+\`" "$DUMP_FILE" | sed -E "s/^INSERT INTO \`//; s/\`\$//" | sort -u > /tmp/tables_to_sync.txt
{
  echo "SET FOREIGN_KEY_CHECKS=0;"
  while read -r t; do echo "TRUNCATE TABLE \`$t\`;"; done < /tmp/tables_to_sync.txt
  echo "SET FOREIGN_KEY_CHECKS=1;"
} | mysql -h srv572.hstgr.io -u u629128033_btree_staging -pSENHA_STAGING u629128033_btree_staging
mysql -h srv572.hstgr.io -u u629128033_btree_staging -pSENHA_STAGING u629128033_btree_staging < "$DUMP_FILE"
'
```

**3. Verificar (comparar contagem de linhas produção vs staging em algumas tabelas-chave):**

```bash
ssh -i "C:\Users\eduar\.ssh\btree_hostinger_staging" -p 65002 u629128033@212.1.211.65 '
for t in users clients cargo_loads equipment collaborators financial_entries fuel_invoices; do
  P=$(mysql -h srv572.hstgr.io -u u629128033_btree -pSENHA_PRODUCAO u629128033_btree_ambienta -N -e "SELECT COUNT(*) FROM \`$t\`;" 2>/dev/null)
  S=$(mysql -h srv572.hstgr.io -u u629128033_btree_staging -pSENHA_STAGING u629128033_btree_staging -N -e "SELECT COUNT(*) FROM \`$t\`;" 2>/dev/null)
  printf "%-20s prod=%-8s staging=%-8s %s\n" "$t" "$P" "$S" "$([ "$P" = "$S" ] && echo OK || echo DIVERGENTE)"
done
'
```

**4. Limpar os arquivos temporários no servidor (têm caminho, não credenciais, mas por segurança):**

```bash
ssh -i "C:\Users\eduar\.ssh\btree_hostinger_staging" -p 65002 u629128033@212.1.211.65 '
rm -f /tmp/prod_data_dump_*.sql /tmp/tables_to_sync.txt /tmp/last_dump_path.txt
'
```

### Alternativa: script pronto (`scripts/sync-staging-db-from-prod.sh`)

Existe uma versão empacotada em `scripts/sync-staging-db-from-prod.sh` que
faz os passos 1+2 acima automaticamente, com confirmação interativa antes do
truncate. Esse arquivo está no `.gitignore` (nunca é commitado) porque é
pra ser preenchido localmente com credenciais reais antes de cada uso —
edite os campos `PREENCHER_...` no topo, copie pro servidor via SSH/SCP ou
Gerenciador de Arquivos, rode com `bash sync-staging-db-from-prod.sh`, e
apague o arquivo do servidor no final (`rm sync-staging-db-from-prod.sh`).

### Lista de tabelas nunca tocadas por este processo

```
sicoob_boletos, sicoob_extrato, sicoob_saldo_mes, sicoob_lancamentos_futuros,
categorias_financeiras, contaazul_tokens, notas_fiscais,
notas_fiscais_status_log, cliente_prazo_pagamento, favorecido_categoria
```

(São as tabelas novas do módulo financeiro — só existem no staging, por
isso ficam de fora tanto do dump quanto do truncate.)

---

## Troubleshooting

### Erro: `build.sh` com problema de CRLF / `set: -` inválido

O Git no Windows (`core.autocrlf`) costuma converter quebras de linha do
`build.sh` de `LF` para `CRLF` na cópia de trabalho local, o que quebra o
interpretador bash na Hostinger (que espera `LF`). O script
`build-staging-package.ps1` já corrige isso automaticamente no Passo 1. Se
estiver montando o pacote manualmente, rode antes de compactar:

```bash
sed -i 's/\r$//' build.sh
```

### Rotas como `/login` retornam 403 Forbidden

Sinal de que os arquivos estáticos (`dist/public/*`) não foram copiados para
a pasta `public_html` daquele site. Confirme se existe uma pasta
`public_html` irmã da pasta `nodejs` (onde o app roda) — é isso que o
`build.sh` procura automaticamente. Se a implantação da Hostinger não rodar
o `build.sh` (algumas configurações pulam esse passo), pode ser necessário
copiar manualmente o conteúdo de `dist/public/` para `public_html/` pelo
Gerenciador de Arquivos.

### Zip com arquivos "quebrados" ou pastas viradas em nomes esquisitos ao extrair no Linux

Isso acontece se o zip for gerado com `Compress-Archive` do PowerShell — ela
grava os caminhos internos com `\` (barra invertida), que o `unzip` do Linux
não reconhece como separador de pasta. O script `build-staging-package.ps1`
já usa `System.IO.Compression` com `/`, que é o formato correto. Nunca use
`Compress-Archive` para este fluxo.

### Erro do Sicoob: "Certificado digital é obrigatório para este recurso"

Sinal de que o `.pfx` não está sendo carregado. A partir desta versão, o
código loga o motivo exato nos **Logs de execução** do app (procure por
`[Sicoob]`):

- `SICOOB_CERT_PATH não está definido` → variável não foi salva/aplicada
  ainda (precisa redeploy/restart depois de adicionar a variável)
- `Certificado não encontrado. ... cwd="..." | caminho resolvido="..."` →
  compare o `cwd` do log com o caminho que você configurou. Se o `cwd` for
  algo como `.../hbuilds/versions/<uuid>/nodejs`, você está usando caminho
  **relativo** — troque para o caminho **absoluto** da pasta estática
  `nodejs/certs/`, como explicado no aviso do Passo 4
- `Certificado carregado de: ...` → o certificado foi encontrado; se ainda
  assim der erro de autorização, o problema é outro (senha do certificado
  errada em `SICOOB_CERT_PASSPHRASE`, client ID incorreto, etc.)

### Erro de conexão SSH (`Connection closed`)

Normalmente é a proteção anti-brute-force da Hostinger derrubando a conexão
após tentativas de senha incorretas/incompletas. Espere alguns minutos ou
redefina a senha SSH em **Avançado → Acesso SSH → Alterar**. O SSH não é
necessário para este fluxo de deploy — é só uma ferramenta extra de
diagnóstico, se precisar.
