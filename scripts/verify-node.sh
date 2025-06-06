#!/bin/bash

echo "🔍 Verifying Node.js compatibility..."

# Check if dist exists
if [ ! -d "dist" ]; then
  echo "❌ Error: dist directory not found. Run 'bun run build' first."
  exit 1
fi

# Test 1: Check if index.js exists
if [ ! -f "dist/index.js" ]; then
  echo "❌ Error: dist/index.js not found"
  exit 1
fi
echo "✅ dist/index.js exists"

# Test 2: Syntax check with Node.js
node -c dist/index.js
if [ $? -ne 0 ]; then
  echo "❌ Error: Node.js syntax check failed"
  exit 1
fi
echo "✅ Node.js syntax check passed"

# Test 3: Test module loading
echo "🧪 Testing module loading..."
node -e "try { require('./dist/index.js'); console.log('✅ Module loads successfully'); } catch(e) { console.error('❌ Module loading failed:', e.message); process.exit(1); }"

echo ""
echo "📋 Summary: Node.js compatibility verified!"
echo "The built artifact can be run with: node dist/index.js"