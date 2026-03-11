#!/bin/bash
set -e

echo "=== BTREE Ambiental Build ==="
echo "Node: $(node --version)"

# Usar pnpm (já disponível no ambiente) para instalar dependências
# pnpm usa o pnpm-lock.yaml que não tem o problema workspace:* do npm
if command -v pnpm &> /dev/null; then
  echo "Using pnpm..."
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
else
  echo "pnpm not found, installing..."
  npm install -g pnpm@latest --legacy-peer-deps
  pnpm install
fi

# Garantir que o vite está instalado
if ! [ -f "./node_modules/.bin/vite" ]; then
  echo "Vite not found, installing explicitly..."
  pnpm add -D vite@7.1.9 @vitejs/plugin-react@4.3.4 esbuild@0.25.0 --no-save 2>/dev/null || \
  npm install vite@7.1.9 @vitejs/plugin-react@4.3.4 esbuild@0.25.0 --legacy-peer-deps --no-save
fi

# Usar o vite local
export PATH="./node_modules/.bin:$PATH"

echo "Building frontend..."
vite build

echo "Building backend..."
esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js

echo "Build complete!"
