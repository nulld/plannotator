#!/bin/bash
# Test script for Railway deployment
# Usage: ./test-railway.sh [BASE_URL]
# Example: ./test-railway.sh http://localhost:8080

BASE_URL="${1:-http://localhost:8080}"

echo "🧪 Testing Railway deployment at $BASE_URL"
echo ""

# Test 1: Create paste
echo "1️⃣  Testing POST /api/paste..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/paste" \
  -H "Content-Type: application/json" \
  -d '{"data":"test-data-from-script"}')

PASTE_ID=$(echo $RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PASTE_ID" ]; then
  echo "   ❌ Failed to create paste"
  echo "   Response: $RESPONSE"
  exit 1
else
  echo "   ✅ Paste created: $PASTE_ID"
fi

echo ""

# Test 2: Retrieve paste
echo "2️⃣  Testing GET /api/paste/$PASTE_ID..."
RETRIEVE=$(curl -s "$BASE_URL/api/paste/$PASTE_ID")

if echo "$RETRIEVE" | grep -q "test-data-from-script"; then
  echo "   ✅ Paste retrieved successfully"
else
  echo "   ❌ Failed to retrieve paste"
  echo "   Response: $RETRIEVE"
  exit 1
fi

echo ""

# Test 3: Portal index
echo "3️⃣  Testing GET /share (portal)..."
PORTAL=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/share")

if [ "$PORTAL" = "200" ]; then
  echo "   ✅ Portal accessible"
else
  echo "   ❌ Portal not accessible (HTTP $PORTAL)"
  exit 1
fi

echo ""

# Test 4: Root redirect
echo "4️⃣  Testing GET / (root)..."
ROOT=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")

if [ "$ROOT" = "200" ]; then
  echo "   ✅ Root accessible"
else
  echo "   ❌ Root not accessible (HTTP $ROOT)"
  exit 1
fi

echo ""

# Test 5: SPA routing for /p/:id
echo "5️⃣  Testing GET /p/abc123 (SPA routing)..."
SPA=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/p/abc123")

if [ "$SPA" = "200" ]; then
  echo "   ✅ SPA routing works"
else
  echo "   ❌ SPA routing failed (HTTP $SPA)"
  exit 1
fi

echo ""
echo "✅ All tests passed!"
echo ""
echo "📋 Summary:"
echo "   Paste API:  $BASE_URL/api/paste"
echo "   Portal:     $BASE_URL/share"
echo "   Short URL:  $BASE_URL/p/$PASTE_ID"
echo ""
echo "🌐 Open in browser:"
echo "   $BASE_URL/share"
