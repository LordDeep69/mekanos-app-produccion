#!/bin/bash
# Render.com Build Script - Mekanos API
# Instala dependencias y construye el proyecto

set -e  # Exit on error

echo "🚀 Starting Render build process..."

# 1. Instalar pnpm globalmente
echo "📦 Installing pnpm..."
npm install -g pnpm

# 2. Instalar dependencias del workspace
echo "📦 Installing workspace dependencies..."
NODE_ENV=development pnpm install --no-frozen-lockfile --ignore-scripts

# 3. Generar Prisma Client
echo "🔧 Generating Prisma Client..."
cd packages/database
pnpm prisma generate
cd ../..

# 4. Instalar Chromium para Puppeteer
echo "🌐 Installing Chromium for Puppeteer..."
pnpx puppeteer browsers install chrome

# 5. Build de la aplicación
echo "🏗️ Building application..."
cd apps/api
pnpm run build

echo "✅ Build completed successfully!"
