#!/bin/bash
# Kokonut Agent Economy Stack - Deployment Script
# Run: ./deploy.sh [network]
# Default: sepolia

set -e

NETWORK=${1:-sepolia}

echo "========================================"
echo "Kokonut Agent Economy Stack Deployer"
echo "========================================"

# Load environment variables
if [ -f .env ]; then
    echo "Loading .env file..."
    while IFS= read -r line; do
        if [[ ! "$line" =~ ^#.* ]] && [[ -n "$line" ]]; then
            if [[ "$line" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then
                export "$line"
            fi
        fi
    done < .env
fi

# Check required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "PRIVATE_KEY not found in .env"
    echo "Please edit .env and add your private key"
    exit 1
fi

if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo "ETHERSCAN_API_KEY not found in .env"
    echo "Please edit .env and add your Etherscan API key"
    exit 1
fi

# Set RPC based on network
case $NETWORK in
    sepolia)
        RPC_URL=${SEPOLIA_RPC_URL:-"https://ethereum-sepolia.publicnode.com"}
        CHAIN="sepolia"
        ;;
    mainnet)
        RPC_URL=${ETHEREUM_RPC_URL:-"https://eth.llamarpc.com"}
        CHAIN="mainnet"
        ;;
    *)
        echo "Unknown network: $NETWORK"
        echo "Usage: ./deploy.sh [sepolia|mainnet]"
        exit 1
        ;;
esac

echo "Network: $NETWORK"
echo "RPC URL: $RPC_URL"
echo ""

# Deploy contracts
echo "Deploying contracts to $NETWORK..."
echo ""

# Run the deployment script
forge script scripts/Deploy.s.sol:DeployContracts \
    --private-key "$PRIVATE_KEY" \
    --broadcast \
    --verify \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    --chain $CHAIN \
    --rpc-url "$RPC_URL"

echo ""
echo "========================================"
echo "Deployment Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Copy the contract addresses from the output above"
echo "2. Update apps/web/lib/wagmi.ts with the deployment addresses"
echo "3. Run UI: cd apps/web && npm run dev"
echo ""
