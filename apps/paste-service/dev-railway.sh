#!/bin/bash
# Local development script for Railway target (no Docker)
# Builds portal and runs railway server

set -e

echo "🔨 Building portal..."
bun run build:portal

echo ""
echo "✅ Portal built to apps/portal/dist"
echo ""

# Create symlink if it doesn't exist
LINK_PATH="apps/paste-service/public/share"
if [ ! -L "$LINK_PATH" ]; then
  echo "🔗 Creating symlink: $LINK_PATH → apps/portal/dist"
  mkdir -p apps/paste-service/public
  ln -sf "$(pwd)/apps/portal/dist" "$LINK_PATH"
fi

echo ""
echo "🚀 Starting Railway server..."
echo "   Portal: http://localhost:8080/share"
echo "   API:    http://localhost:8080/api/paste"
echo "   Data:   $(pwd)/apps/paste-service/data/pastes"
echo ""

# Run railway server with local configuration
PASTE_DATA_DIR="$(pwd)/apps/paste-service/data/pastes" \
  PLANNOTATOR_SHARE_URL="http://localhost:8080" \
  PLANNOTATOR_PASTE_URL="http://localhost:8080" \
  bun run --cwd apps/paste-service railway
