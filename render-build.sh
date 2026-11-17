#!/bin/bash
# Build Script White-Label para PaaS (Render.com / VM Linux)
set -euo pipefail

echo "🚀 Starting EAM Platform build process..."

if ! command -v pnpm >/dev/null 2>&1; then
  echo "📦 Installing pnpm@8.11.0..."
  npm install -g pnpm@8.11.0
fi

echo "📦 Installing workspace dependencies..."
NODE_ENV=development pnpm install --no-frozen-lockfile --ignore-scripts

echo "🔧 Generating Prisma Client & building workspace packages..."
pnpm --filter @mekanos/database exec prisma generate
pnpm --filter @mekanos/shared build
pnpm --filter @mekanos/core build
pnpm --filter @mekanos/database build

if [ "${SKIP_CHROMIUM_INSTALL:-false}" != "true" ]; then
  echo "🌐 Installing Chromium for Puppeteer..."
  pnpx puppeteer browsers install chrome
fi

echo "🏗️ Building API application..."
pnpm --filter @mekanos/api build

echo "✅ Build completed successfully!"
