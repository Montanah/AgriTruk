#!/bin/bash
set -e

echo "🔧 TRUKAPP Build Setup"
echo "======================="

# Clean up any artifacts
echo "1️⃣ Cleaning up artifacts..."
rm -rf node_modules .expo .build-logs build dist

# Install dependencies
echo "2️⃣ Installing dependencies..."
npm install --legacy-peer-deps

# Verify configuration
echo "3️⃣ Verifying configuration..."
[ -f package.json ] && echo "✅ package.json found"
[ -f app.json ] && echo "✅ app.json found"
[ -f eas.json ] && echo "✅ eas.json found"
[ -f .npmrc ] && echo "✅ .npmrc found (legacy-peer-deps=true)"
[ -d src ] && echo "✅ src/ directory found"
[ -d assets ] && echo "✅ assets/ directory found"

# Display status
echo ""
echo "📊 Project Status:"
du -sh . | awk '{print "Total size: " $1}'
ls -d src assets android ios 2>/dev/null | wc -l | awk '{print "Essential directories: " $1}'

echo ""
echo "✅ Setup complete! Ready for build."
echo ""
echo "To build APK, run: ./build.sh"
