# Tenderly Integration Guide

> Last updated: April 2026

This guide explains how to set up real-time monitoring and alerts using Tenderly.

## Overview

Tenderly provides:

- Real-time transaction monitoring
- Custom alerts for unusual activity
- Gas tracking and optimization
- Debugging for failed transactions

## Setup

### 1. Create Tenderly Account

1. Go to https://tenderly.co
2. Sign up with GitHub
3. Create a new project for "Kokonut Agent Economy"

### 2. Add RPC Endpoint

In your `.env`:

```bash
# Replace with your Tenderly RPC
TENDERLY_RPC_URL=https://rpc.tenderly.co/YOUR_PROJECT_ID
```

### 3. Configure Alerts (Dashboard)

Create alerts in Tenderly dashboard:

| Alert Type         | Condition                      | Action      |
| ------------------ | ------------------------------ | ----------- |
| Large Transfer     | `USDC transfer > 1000`         | Slack/Email |
| Slash Event        | `SlashManager.executeSlash`    | Slack       |
| Job Created        | `AgenticCommerceV6.JobCreated` | Discord     |
| Failed Transaction | `tx.status == 0`               | Email       |

### 4. API Integration

For programmatic access:

```typescript
import { Tenderly } from '@tenderly/sdk';

const tenderly = new Tenderly({
  projectId: process.env.TENDERLY_PROJECT_ID,
  accessKey: process.env.TENDERLY_ACCESS_KEY,
});

// Get transaction debug info
const debug = await tenderly.debugTransaction(txHash);

// Get gas used
const gasUsed = debug.gasUsed;
```

## Monitoring Scripts

### Watch for Large Jobs

```typescript
// Monitor job creation above threshold
const THRESHOLD_USDC = 10000n * 1e6; // 10,000 USDC

async function watchLargeJobs() {
  const filter = await contract.filters.JobCreated();
  const events = await contract.queryFilter(filter, fromBlock);

  for (const event of events) {
    if (event.args.budget > THRESHOLD_USDC) {
      sendAlert({
        type: 'LARGE_JOB',
        jobId: event.args.jobId,
        budget: event.args.budget,
        client: event.args.client,
      });
    }
  }
}
```

### Monitor Slash Proposals

```typescript
// Watch for slash events
const slashFilter = await slashManager.filters.ProposalExecuted();

slashManager.on(slashFilter, (proposalHash, evaluator, amount) => {
  sendAlert({
    type: 'SLASH_EVENT',
    evaluator,
    amount: formatEther(amount),
    proposalHash,
  });
});
```

## Gas Monitoring

### Track Gas Spikes

```typescript
const GAS_THRESHOLD = 500000; // 500k gas

async function checkGasUsage() {
  const recentBlocks = (await provider.getBlockNumber()) - 10;

  for (let i = recentBlocks; i < (await provider.getBlockNumber()); i++) {
    const block = await provider.getBlock(i);
    if (block.gasUsed > GAS_THRESHOLD) {
      console.log(`High gas in block ${i}: ${block.gasUsed}`);
    }
  }
}
```

## Dashboard Widgets

Add to your monitoring dashboard:

```
┌─────────────────────────────────────────────────┐
│  📊 Kokonut Monitor                             │
├─────────────────────────────────────────────────┤
│  Active Jobs:     [count]                      │
│  Active Proposals: [count]                      │
│  24h Volume:      [USDC amount]                │
│  Gas Average:     [gwei]                        │
│  Failed Txs:      [count]                       │
└─────────────────────────────────────────────────┘
```

## Alert Channels

Configure in Tenderly dashboard:

- **Slack**: #kokonut-alerts
- **Discord**: Webhook channel
- **Email**: dev@kokonut.network
- **PagerDuty**: On-call rotation

## Security Checklist

- [ ] Enable 2FA on Tenderly
- [ ] Set up budget alerts (→ 90% spend)
- [ ] Configure failed tx alerts
- [ ] Add slash event monitoring
- [ ] Set up RPC fallback alerts
- [ ] Add contract upgrade alerts

## Reference

- Tenderly Docs: https://docs.tenderly.co
- API Reference: https://dashboard.tenderly.co/account/api
