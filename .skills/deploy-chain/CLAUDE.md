# Deploy to New EVM Chain

Skill for deploying Kokonut Agent Economy contracts to new EVM-compatible chains.

## Installation

```
install-skill deploy-chain
```

## Usage

```
deploy-kokonut-chain <chain-name> <chain-id> <rpc-url>
deploy-kokonut-chain polygon 137 https://polygon-rpc.com
```

## What This Does

1. **Deploys all contracts** to the target chain using Foundry
2. **Updates contract addresses** in `lib/contracts/config.ts`
3. **Adds chain config** to `lib/chains.ts` and `lib/caip.ts`
4. **Configures Wagmi** with RPC and explorer URLs in `lib/wagmi.ts`
5. **Updates type definitions** in `lib/types/contracts.ts`

## Required Steps (Manual)

If the skill fails, follow these steps manually:

### 1. Deploy Contracts via Foundry

```bash
cd packages/contracts

# Deploy all contracts to new chain
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify
```

### 2. Update Contract Addresses

Edit `apps/web/lib/contracts/config.ts`:

```typescript
export const CONTRACTS_BY_CHAIN: Record<string, ChainContracts> = {
  // Add new chain:
  '<chainId>': {
    erc8004Registry: '<new-address>',
    erc8004Reputation: '<new-address>',
    serviceRegistry: '<new-address>',
    agenticCommerce: '<new-address>',
    agentReview: '<new-address>',
    skillRegistry: '<new-address>',
    priceOracle: '<new-address>',
    usdc: '<usdc-address>',
  },
};
```

### 3. Add Chain Configuration

Edit `apps/web/lib/chains.ts`:

```typescript
export const SUPPORTED_CHAINS = [
  // Add new chain
  {
    id: <chainId>,
    name: '<Chain Name>',
    caip2: 'eip155:<chainId>',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['<rpc-url>'] } },
    blockExplorers: { default: { url: '<explorer-url>' } },
  },
];
```

### 4. Update Wagmi Config

Edit `apps/web/lib/wagmi.ts`:

```typescript
export const chainConfig: Record<number, ChainConfig> = {
  // Add chain
  <chainId>: {
    name: '<name>',
    rpc: '<rpc-url>',
    explorer: '<explorer-url>',
    explorerApi: '<explorer-api-url>',
  },
};
```

## Contract Addresses (Known)

| Contract        | Sepolia Address                            |
| --------------- | ------------------------------------------ |
| Identity        | 0x8004A818BFB912233c491871b3d84c89A494BD9e |
| Reputation      | 0x8004B663056A597Dffe9eCcC1965A193B7388713 |
| ServiceRegistry | 0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201 |
| AgenticCommerce | 0x948d97EA7F0c49796fB576ADff375C900627568E |
| AgentReview     | 0x5CDb592Fd37749bF87448FBf5725D1Cd986dd1Cb |
| SkillRegistry   | 0xA84684261558f342d6871DD2CFef90A2117Aa20A |
| PriceOracle     | 0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047 |

## Common USDC Addresses

| Chain     | USDC Address                               |
| --------- | ------------------------------------------ |
| Ethereum  | 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 |
| Polygon   | 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174 |
| Arbitrum  | 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8 |
| Optimism  | 0x0b2C639c533813f4Aa9D7837AfAf533E41bdec26 |
| BSC       | 0x8AC76a51cc950d9822D68b83fE1Ad05B93EEdCF6 |
| Avalanche | 0xB97EF9Ef0634B3Ebc50E8a9E8c98c6e28F10D9c3 |

## Verification

After deployment, verify:

```bash
# Check contract on explorer
cast call <contract-address> "getCurrentAgentId()" --rpc-url <rpc-url>
```
