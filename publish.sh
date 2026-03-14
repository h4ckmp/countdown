#!/bin/bash
# One-shot publish script for countdown-timer-cli
# Prerequisites: run `npm login` first

set -e

echo "🔍 Checking npm login..."
npm whoami || { echo "❌ Not logged in. Run: npm login"; exit 1; }

echo "🧪 Running tests..."
npm test

echo "🏷️  Creating git tag v1.0.0..."
git tag -a v1.0.0 -m "v1.0.0" 2>/dev/null || echo "   (tag v1.0.0 already exists, skipping)"

echo "📦 Publishing countdown-timer-cli@1.0.0..."
npm publish --access public

echo "📤 Pushing tag to GitHub..."
git push origin v1.0.0 2>/dev/null || echo "   (push failed or tag already on remote, skipping)"

echo "✅ Published! Verify with:"
echo "   npm view countdown-timer-cli"
echo "   npm install -g countdown-timer-cli"
