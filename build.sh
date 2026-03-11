#!/bin/bash
set -e

echo "=== BTREE Ambiental Build ==="
echo "Node: $(node --version)"
echo "npm: $(npm --version)"

# Sempre instalar todas as dependências (incluindo devDependencies para o build)
echo "Installing all dependencies..."
npm install --include=dev --legacy-peer-deps

# Garantir que o vite e plugin-react estão instalados
if ! [ -f "./node_modules/.bin/vite" ]; then
  echo "Vite not found, installing explicitly..."
  npm install vite@7.1.9 @vitejs/plugin-react@5.0.4 esbuild@0.25.0 --legacy-peer-deps --no-save
fi

# Usar o vite local
export PATH="./node_modules/.bin:$PATH"

echo "Building frontend..."
vite build

echo "Building backend..."
esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js

echo "Build complete!"
