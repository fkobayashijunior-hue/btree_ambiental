#!/bin/bash
set -e

echo "=== Construção Ambiental BTREE ==="
echo "Nó: $(node --version)"

# ─── Estratégia de build ──────────────────────────────────────────────────────
#
# HOSTINGER (produção):
#   - O dist/ já vem pré-compilado no repositório (frontend + backend)
#   - Instalamos APENAS as dependências de runtime (sem vite, sem plugin-react)
#   - Usamos package.hostinger.json que não tem dependências com workspace:*
#
# MANUS / LOCAL (desenvolvimento):
#   - Usa pnpm para instalar tudo e compilar normalmente
#
# ─────────────────────────────────────────────────────────────────────────────

if command -v pnpm &> /dev/null; then
  # ── Ambiente de desenvolvimento (Manus / local) ──
  echo "Dev environment (pnpm). Full build..."
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  export PATH="./node_modules/.bin:$PATH"
  echo "Building frontend..."
  vite build
  echo "Building backend..."
  esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js
else
  # ── Ambiente de produção (Hostinger) ──
  # dist/ já está pré-compilado no repositório
  echo "Ambiente de produção (Hostinger). Instalando apenas as dependências de tempo de execução..."

  if [ -f "package.hostinger.json" ]; then
    # Usar package.hostinger.json (sem dependências de build com workspace:*)
    cp package.json package.json.bak
    cp package.hostinger.json package.json
    npm install --legacy-peer-deps
    cp package.json.bak package.json
    rm -f package.json.bak
  else
    # Fallback: instalar com legacy-peer-deps
    npm install --legacy-peer-deps
  fi

  echo "Usando dist/ pré-compilado do repositório."

  # ── Copiar arquivos estáticos para public_html ──
  # O LiteSpeed/Passenger da Hostinger serve arquivos estáticos de public_html
  # Sem isso, rotas SPA como /login retornam 403 Forbidden
  #
  # IMPORTANTE: NÃO usar um caminho fixo (com o domínio hardcoded) aqui. Numa
  # conta Hostinger com produção e staging no mesmo $HOME (subdomínio/addon
  # domain), isso faria o script sobrescrever o public_html de produção mesmo
  # rodando dentro do app de staging.
  #
  # Layout confirmado da Hostinger para cada site: a pasta do app Node
  # ("nodejs/", onde este script roda) e a pasta "public_html/" são IRMÃS,
  # dentro da raiz daquele site específico (ex: .../<site>/nodejs e
  # .../<site>/public_html). Por isso basta olhar um nível acima do diretório
  # atual — nunca subimos mais que isso, então é impossível alcançar o
  # public_html de outro site (ex: produção) por este caminho.
  #
  # Para forçar um caminho específico (ex: estrutura atípica), defina
  # DEPLOY_PUBLIC_HTML antes de chamar este script.
  PUBLIC_HTML=""
  if [ -n "$DEPLOY_PUBLIC_HTML" ]; then
    PUBLIC_HTML="$DEPLOY_PUBLIC_HTML"
    echo "Usando PUBLIC_HTML definido explicitamente via DEPLOY_PUBLIC_HTML: $PUBLIC_HTML"
  elif [ -d "../public_html" ]; then
    PUBLIC_HTML="$(cd ../public_html && pwd)"
    echo "Diretório public_html encontrado (irmão de $(pwd)): $PUBLIC_HTML"
  else
    echo "AVISO: Não encontrei uma pasta 'public_html' irmã de $(pwd)."
    echo "Pulando a cópia por segurança — nenhum outro site será tocado."
    echo "Se necessário, rode novamente com DEPLOY_PUBLIC_HTML=/caminho/exato/public_html bash build.sh"
  fi
  if [ -n "$PUBLIC_HTML" ] && [ -d "dist/public" ]; then
    echo "Limpando assets antigos do public_html..."
    rm -rf "$PUBLIC_HTML/assets" 2>/dev/null || true
    rm -f "$PUBLIC_HTML/index.html" 2>/dev/null || true
    rm -f "$PUBLIC_HTML/registerSW.js" 2>/dev/null || true
    rm -f "$PUBLIC_HTML/manifest.json" 2>/dev/null || true
    rm -f "$PUBLIC_HTML/manifest.webmanifest" 2>/dev/null || true
    rm -f "$PUBLIC_HTML/sw.js" 2>/dev/null || true

    echo "Copiando novos assets estáticos para public_html..."
    cp -r dist/public/* "$PUBLIC_HTML/"
    # Copiar arquivos ocultos (como .htaccess) explicitamente — cp * não copia arquivos que começam com ponto
    cp dist/public/.htaccess "$PUBLIC_HTML/.htaccess" 2>/dev/null || true
    echo "Assets estáticos copiados para public_html (incluindo .htaccess)."

    # Verificar que o index.html correto foi copiado
    if [ -f "$PUBLIC_HTML/index.html" ]; then
      echo "index.html verificado em public_html:"
      grep -o 'assets/index-[^"]*' "$PUBLIC_HTML/index.html" || true
    fi
  fi

  # ── Reiniciar o Passenger (Node.js app) ──
  # Criar tmp/restart.txt para sinalizar ao Passenger que deve reiniciar
  mkdir -p tmp
  touch tmp/restart.txt
  echo "Passenger restart sinalizado (tmp/restart.txt)."
fi

echo "Build completo!"
