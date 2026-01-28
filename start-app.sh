#!/bin/bash
# Script to start Agent-Workspace with Personal Tasks fix

cd "$(dirname "$0")"

echo "🔧 Preparing Electron environment..."

# Ensure dist-electron directory exists
mkdir -p dist-electron

# Copy preload file
cp electron/preload.js dist-electron/preload.cjs
echo "✅ Preload file copied"

# Start the app
echo "🚀 Starting Agent-Workspace..."
npm run electron:dev
