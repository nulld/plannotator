#!/usr/bin/env bash
set -e

echo "🧪 Testing Plannotator remote share URL generation..."
echo ""

# Create test markdown file in current directory (not /tmp)
TEST_FILE="./test-document.md"
cat > "$TEST_FILE" << 'EOF'
# Test Plan

This is a test document to verify Plannotator remote share URL generation.

## Features to Test

- ✅ Compression (deflate)
- ✅ Encryption (AES-256-GCM)
- ✅ Paste service upload
- ✅ Short URL generation

## Expected Output

The CLI should generate a short URL like:
`https://plannotator-production.up.railway.app/p/{id}#key={key}`

The paste service will store encrypted data, and the decryption key stays in the URL fragment (never sent to server).
EOF

echo "📝 Created test file: $TEST_FILE"
ls -lh "$TEST_FILE"
echo ""

# Set environment variables
export PLANNOTATOR_REMOTE=1
export PLANNOTATOR_SHARE_URL="https://plannotator-production.up.railway.app"
export PLANNOTATOR_PASTE_URL="https://plannotator-production.up.railway.app"

echo "🔧 Environment:"
echo "  PLANNOTATOR_REMOTE=$PLANNOTATOR_REMOTE"
echo "  PLANNOTATOR_SHARE_URL=$PLANNOTATOR_SHARE_URL"
echo "  PLANNOTATOR_PASTE_URL=$PLANNOTATOR_PASTE_URL"
echo ""

echo "🚀 Running: bun run apps/hook/server/index.ts annotate $TEST_FILE"
echo ""
echo "---"
echo ""

# Run plannotator (press Ctrl+C to stop after you see the URL)
bun run apps/hook/server/index.ts annotate "$TEST_FILE"
