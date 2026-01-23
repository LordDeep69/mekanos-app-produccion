#!/bin/bash
set -e

echo "🚀 [RENDER START] Starting application..."

# Navigate to API directory
cd /opt/render/project/src/apps/api

# Start the production server
echo "▶️ Starting NestJS server..."
pnpm run start:prod
