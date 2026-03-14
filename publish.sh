#!/bin/bash
# One-shot publish script for countdown-timer-cli
# Prerequisites: run `npm login` first

set -e

echo "🔍 Checking npm login..."
npm whoami || { echo "❌ Not logged in. Run: npm login"; exit 1; }

echo "🧪 Running tests..."
node --test test.js

echo "📦 Publishing countdown-timer-cli@1.0.0..."
npm publish --access public

echo "✅ Published! Verify with:"
echo "   npm view countdown-timer-cli"
echo "   npm install -g countdown-timer-cli"
