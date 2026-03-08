#!/bin/bash
set -e

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Garantir que o vite está instalado e acessível
if ! [ -f "./node_modules/.bin/vite" ]; then
  echo "Installing vite..."
  npm install vite@7.1.9 @vitejs/plugin-react@5.0.4 esbuild@0.25.0 --no-save
fi

# Usar o vite local
export PATH="./node_modules/.bin:$PATH"

echo "Building frontend..."
vite build

echo "Building backend..."
esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/index.js

echo "Build complete!"
