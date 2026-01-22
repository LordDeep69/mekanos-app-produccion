#!/bin/bash
set -e

echo "🚀 [RENDER BUILD] Starting build process..."

# 1. Install pnpm globally if not present
if ! command -v pnpm &> /dev/null; then
    echo "📦 Installing pnpm..."
    npm install -g pnpm@8
fi

# 2. Navigate to monorepo root
cd /opt/render/project/src
echo "📍 Current directory: $(pwd)"

# 3. Install all dependencies with pnpm
echo "📦 Installing dependencies with pnpm..."
pnpm install --frozen-lockfile

# 4. Install Chrome for Puppeteer in the API workspace
echo "🌐 Installing Chrome for Puppeteer..."
cd apps/api
export PUPPETEER_CACHE_DIR=/opt/render/project/src/apps/api/node_modules/.cache/puppeteer
npx puppeteer browsers install chrome

# 5. Build the API
echo "🔨 Building API..."
pnpm run build

echo "✅ [RENDER BUILD] Build completed successfully!"
