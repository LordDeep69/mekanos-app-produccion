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

# 3. Install all dependencies with pnpm (skip postinstall scripts first)
# Include dev dependencies even in production for build tools like Prisma
echo "📦 Installing dependencies with pnpm..."
NODE_ENV=development pnpm install --no-frozen-lockfile --ignore-scripts

# 4. Generate Prisma client manually (after dependencies are installed)
echo "🔧 Generating Prisma client..."
cd packages/database
pnpm exec prisma generate
cd ../..

# 5. Install Chrome for Puppeteer in the API workspace
echo "🌐 Installing Chrome for Puppeteer..."
cd apps/api
export PUPPETEER_CACHE_DIR=/opt/render/project/src/apps/api/node_modules/.cache/puppeteer
npx puppeteer browsers install chrome

# 6. Build the API
echo "🔨 Building API..."
pnpm run build

echo "✅ [RENDER BUILD] Build completed successfully!"
