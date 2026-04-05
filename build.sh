#!/bin/bash
set -e

echo "=== BTREE Ambiental Build ==="
echo "Node: $(node --version)"

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
  echo "Production environment (Hostinger). Installing runtime deps only..."

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

  echo "Using pre-built dist/ from repository."

  # ── Copiar arquivos estáticos para public_html ──
  # O LiteSpeed/Passenger da Hostinger serve arquivos estáticos de public_html
  # Sem isso, rotas SPA como /login retornam 403 Forbidden
  PUBLIC_HTML="$HOME/domains/btreeambiental.com/public_html"
  if [ -d "$PUBLIC_HTML" ] && [ -d "dist/public" ]; then
    echo "Copying static assets to public_html..."
    cp -r dist/public/* "$PUBLIC_HTML/" 2>/dev/null || true
    echo "Static assets copied to public_html."
  fi
fi

echo "Build complete!"
