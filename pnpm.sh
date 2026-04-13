#!/bin/bash
# Kokonut pnpm wrapper - ensures correct PATH for pnpm
export PATH="/Users/gilbertoadon/.hermes/node/bin:$PATH"
exec pnpm "$@"
