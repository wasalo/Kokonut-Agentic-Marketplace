#!/usr/bin/env bash
# setup-foundry.sh — Install / select the pinned Foundry toolchain.
#
# CI uses foundry-rs/foundry-toolchain@v1 with version nightly-2026-03-22.
# This script replicates the same environment locally so that
# `forge test` produces identical results.
#
# Usage:
#   pnpm run setup:foundry        (from repo root)
#   bash scripts/setup-foundry.sh (direct)

set -euo pipefail

PINNED_VERSION="nightly-2026-03-22"

echo "🔧 Kokonut Foundry Bootstrap"
echo "   Pinned version: $PINNED_VERSION"
echo ""

# 1. Install foundryup if not present
if ! command -v foundryup &>/dev/null; then
  echo "📦 Installing foundryup..."
  curl -L https://foundry.paradigm.xyz | bash
  # Source the env so foundryup is available in this shell
  export PATH="$HOME/.foundry/bin:$PATH"
else
  echo "✅ foundryup already installed"
fi

# 2. Install the pinned nightly toolchain
echo "📦 Installing Foundry toolchain ($PINNED_VERSION)..."
foundryup --version "$PINNED_VERSION"

# 3. Verify forge is available
if ! command -v forge &>/dev/null; then
  echo "❌ forge not found after install. Check your PATH."
  echo "   Try adding \$HOME/.foundry/bin to your PATH."
  exit 1
fi

echo ""
echo "✅ Foundry ready:"
forge --version
echo ""
echo "Run contract tests with:"
echo "  pnpm run test:contracts"
echo "  forge test -vvv"
