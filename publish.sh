#!/bin/bash
# Publish script for countdown-timer-cli
# Prerequisites: run `npm login` first
# Usage: bash publish.sh

set -e

# Read version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}"
PKG_NAME=$(node -p "require('./package.json').name")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Publishing ${PKG_NAME}@${VERSION}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Pre-flight checks
echo ""
echo "🔍 Checking npm login..."
npm whoami || { echo "❌ Not logged in. Run: npm login"; exit 1; }

echo ""
echo "🧪 Running tests..."
npm test

echo ""
echo "📋 Dry-run — package contents:"
npm publish --dry-run --access public 2>&1
echo ""

# Step 2: Publish to npm
echo "📦 Publishing ${PKG_NAME}@${VERSION}..."
npm publish --access public

# Step 3: Git tag
echo ""
echo "🏷️  Creating git tag ${TAG}..."
git tag -a "${TAG}" -m "${TAG}" 2>/dev/null || echo "   (tag ${TAG} already exists, skipping)"

echo "📤 Pushing tag to GitHub..."
git push origin "${TAG}" 2>/dev/null || echo "   (push failed or tag already on remote, skipping)"

# Step 4: GitHub Release (requires gh CLI)
if command -v gh &> /dev/null; then
  echo ""
  echo "🚀 Creating GitHub Release..."
  gh release create "${TAG}" \
    --title "${TAG}" \
    --notes "## ${PKG_NAME}@${VERSION}

### Install
\`\`\`bash
npm install -g ${PKG_NAME}
\`\`\`

### Changes
- Initial release
- Zero dependencies, pure Node.js
- Three display formats: seconds, mm:ss, hh:mm:ss
- Interactive and CLI modes" \
    2>/dev/null || echo "   (release ${TAG} already exists or gh not authenticated, skipping)"
else
  echo ""
  echo "ℹ️  gh CLI not found — skipping GitHub Release creation."
  echo "   Install: https://cli.github.com"
  echo "   Then run: gh release create ${TAG} --title '${TAG}' --generate-notes"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Done! Verify:"
echo "    npm view ${PKG_NAME}"
echo "    npm install -g ${PKG_NAME}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
