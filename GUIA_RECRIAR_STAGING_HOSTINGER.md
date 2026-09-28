# Guia: Removendo e Recriando o Ambiente de Staging na Hostinger

> Contexto: o plano Business da Hostinger tem um teto de **120 processos**
> compartilhado entre tudo na conta (produção + staging + qualquer outro
> site), e esse limite vem sendo atingido repetidamente. Uma forma de testar
> se o staging está contribuindo pra isso é removê-lo temporariamente e
> observar o gráfico de "Máximo de processos" depois. Este guia existe pra
> você não perder nada ao remover, e conseguir recriar rápido depois.

## 1. Antes de remover — faça backup de tudo isso

Não existe um "pausar" nessa plataforma de apps Node.js da Hostinger — só
"Remover" (que apaga a configuração do app, mas **não mexe no código nem no
banco de dados**). Antes de clicar em Remover, tire print (ou copie pra um
arquivo de texto seguro, fora deste repositório) de:

### 1.1. Tela "Variáveis de ambiente"
Copie **a tela inteira**, todas as linhas chave/valor. As que já sabemos que
existem:

| Chave | Para que serve |
|---|---|
| `NODE_ENV` | Deve ser `production` |
| `DB_HOST` | Host do banco MySQL (staging) |
| `DB_PORT` | Porta do MySQL |
| `DB_USER` | Usuário do banco de staging |
| `DB_PASSWORD` | Senha do banco de staging |
| `DB_NAME` | Nome do banco de staging (`..._btree_staging`) |
| `TRACCAR_URL` | URL da API do Traccar (GPS) |
| `TRACCAR_TOKEN` | Token de autenticação do Traccar |
| `META_WA_PHONE_ID` | ID do número de telefone da API do WhatsApp (Meta) |
| `META_WA_TOKEN` | Token de acesso da API do WhatsApp (Meta) |
| `WHATSAPP_TEMPLATE_NOVA_CARGA` | Nome do template aprovado (`nova_carga_nf`) |
| `WHATSAPP_TEMPLATE_NF_ANEXADA` | Nome do template aprovado (`nf_anexada`) |

Pode ter mais variáveis além dessas (Sicoob, Conta Azul, JWT_SECRET,
etc.) — por isso o ideal é copiar a tela inteira, não confiar só nesta
tabela.

### 1.2. Tela "Configurações de compilação e saída"

| Campo | Valor |
|---|---|
| Configuração predefinida | Express |
| Versão do Node | 22.x |
| Diretório raiz | `./` |
| Gerenciador de pacotes | npm |
| Arquivo de entrada | `dist/index.js` |

### 1.3. Conexão com o Git
- Repositório: `fkobayashijunior-hue/btree_ambiental`
- Branch usada pelo staging (confirme antes de remover — pode ser `main`
  ou uma branch própria)

### 1.4. Domínio
- `staging.btreeambiental.com` — confirme se remover o app desfaz esse
  subdomínio também, ou se ele fica registrado separado (nesse caso só
  precisaria reconectar o app a ele de novo, não recriar do zero).

## 2. Removendo

No hPanel: **Painel de controle** → linha do site `staging.btreeambiental.com`
→ menu de três pontinhos (⋮) → **Remover**.

## 3. Testando se resolveu

Depois de remover, acompanhe o gráfico **"Máximo de processos"** (em
Plano de hospedagem → Consumo de recursos) por algumas horas:

- Se o uso cair e ficar estável, bem abaixo do limite de 120 → o staging
  (ou o acúmulo de reinicializações dele) era parte relevante do problema.
- Se o uso continuar alto/grudado no teto mesmo só com produção rodando →
  o problema não é o staging, e vale investigar o servidor compartilhado
  (outros clientes na mesma máquina) ou considerar o upgrade de plano.

## 4. Recriando o staging depois

1. Painel de controle → **Adicionar site** (ou opção equivalente pra criar
   um novo app Node.js).
2. Configurar o domínio: `staging.btreeambiental.com`.
3. Conectar ao repositório Git (`fkobayashijunior-hue/btree_ambiental`,
   branch correta).
4. Preencher **Configurações de compilação e saída** com os valores da
   seção 1.2.
5. Preencher **Variáveis de ambiente** com os valores que você salvou na
   seção 1.1 (todos, não só os desta tabela).
6. Rodar a primeira implantação e testar login + uma tela de cada área
   principal do sistema.

## 5. Alternativa: manter o staging via deploy manual (zip)

Se preferir não depender do app Node.js dedicado da Hostinger pro
staging, o fluxo que usamos durante boa parte desta sessão também
funciona: gerar o pacote local com
`scripts/build-staging-package.ps1` e subir manualmente pela tela de
"Implantações" sempre que precisar testar algo — sem manter um app
rodando o tempo todo consumindo processos da conta.

---
*Gerado durante a investigação do limite de processos da conta Hostinger —
setembro/2026.*
