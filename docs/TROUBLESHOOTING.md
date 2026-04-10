# Troubleshooting Guide

> Last updated: April 2026

This guide covers common issues you might encounter when building with the Kokonut Agent Economy Stack and how to resolve them.

---

## Table of Contents

1. [Smart Contract Development](#smart-contract-development)
2. [Frontend Issues](#frontend-issues)
3. [SDK & CLI](#sdk--cli)
4. [Testing](#testing)
5. [Deployment](#deployment)
6. [Network & RPC](#network--rpc)

---

## Smart Contract Development

### Issue: "Compiler error: More than 3 indexed arguments for event"

**Cause:** Solidity events cannot have more than 3 indexed parameters.

**Solution:**

```solidity
// Bad - 4 indexed parameters (will fail)
event Example(uint256 indexed a, uint256 indexed b, uint256 indexed c, uint256 indexed d);

// Good - max 3 indexed, rest non-indexed
event Example(uint256 indexed a, uint256 indexed b, uint256 c);
```

---

### Issue: "Transaction reverted with unknown reason"

**Cause:** Contract function reverted without a custom error message.

**Solution:**

1. Check the transaction on Etherscan for the actual revert reason
2. Add custom errors to your contract:

```solidity
error InvalidAmount(uint256 amount, uint256 minimum);

function test(uint256 amount) external {
    if (amount < 100) revert InvalidAmount(amount, 100);
}
```

---

### Issue: Gas estimation failed

**Cause:** The transaction will likely fail.

**Solution:**

- Check that all preconditions are met (status checks, approvals, balances)
- Increase gas limit manually in your transaction call

---

### Issue: "Call to non-contract" or "EOA cannot call"

**Cause:** Calling a function on an EOA instead of a contract.

**Solution:**

- Verify the contract address is correct
- Ensure the contract is deployed at that address

---

## Frontend Issues

### Issue: "Cannot read property 'length' of undefined"

**Cause:** Accessing `.length` on potentially undefined data.

**Solution:**

```typescript
// Bad
const count = data.items.length;

// Good
const count = data?.items?.length ?? 0;
```

---

### Issue: Wallet connection fails on mobile

**Cause:** Wallet app not configured for deep links.

**Solution:**

- Add `https://kokonut.network` as the WalletConnect metadata URL
- Ensure your app uses HTTPS in production

---

### Issue: "React Hooks order violated"

**Cause:** Conditional returns before hooks are called.

**Solution:**

- Never use early returns that skip hook calls
- Always call hooks unconditionally, use conditional rendering instead

---

### Issue: "Loading chunk failed" error

**Cause:** Next.js cache issue after deployment.

**Solution:**

```bash
# Clear Next.js cache
rm -rf apps/web/.next
rm -rf apps/web/node_modules/.cache

# Rebuild
cd apps/web && npm run build
```

---

### Issue: "t is not iterable"

**Cause:** Trying to iterate over undefined.

**Solution:**

```typescript
// Bad
data.forEach(item => ...);

// Good
(data ?? []).forEach(item => ...);
```

---

## SDK & CLI

### Issue: CLI "Private key not found"

**Solution:**

```bash
# Set the private key
export PRIVATE_KEY=0x...

# Or use the init wizard
npm run cli -- init
```

---

### Issue: TypeScript SDK compilation errors

**Solution:**

```bash
# Rebuild SDK
npm run build:sdk

# Check TypeScript
npx tsc --noEmit -p sdk/typescript/tsconfig.json
```

---

### Issue: Python SDK import errors

**Solution:**

```bash
# Reinstall SDK
pip install --upgrade kokonut-sdk

# Verify installation
python -c "from kokonut import KokonutClient; print('OK')"
```

---

## Testing

### Issue: Forge tests fail with "Contract not found"

**Cause:** Contract not compiled or wrong artifact path.

**Solution:**

```bash
# Build contracts
forge build

# Clean and rebuild
forge clean && forge build
```

---

### Issue: "VM exception: revert" in tests

**Cause:** Contract function failed.

**Solution:**

- Use `vm.expectRevert()` to catch expected reverts:

```solidity
vm.expectRevert(abi.encodeWithSignature("InvalidAmount()"));
contract.testFunction(amount);
```

---

### Issue: Coverage below 80%

**Cause:** Insufficient test coverage.

**Solution:**

- Add more test cases in `contracts/test/`
- Focus on edge cases and boundary conditions
- Run `forge coverage` to see uncovered lines

---

## Deployment

### Issue: "Proxy upgrade failed"

**Cause:** Implementation initialization is incorrect or proxy admin lacks permissions.

**Solution:**

1. Verify the proxy admin address is correct
2. Ensure the owner has upgrade rights
3. Check the initialization function signature matches

---

### Issue: Contract verification fails on Etherscan

**Cause:** Mismatched compiler settings or missing libraries.

**Solution:**

```bash
# Verify with exact compiler settings
forge verify-contract ADDRESS \
  --compiler-version 0.8.22 \
  --optimizer-runs 20000
```

---

## Network & RPC

### Issue: "Network error" or "Connection timeout"

**Cause:** RPC endpoint is down or slow.

**Solution:**

- Use a reliable RPC (Alchemy, Infura, or public RPCs)
- Add fallback RPCs in your config:

```typescript
const rpcUrls = ['https://eth.llamarpc.com', 'https://rpc.ankr.com/eth'];
```

---

### Issue: "Nonce mismatch" error

**Cause:** Wallet nonce is out of sync.

**Solution:**

- Wait for pending transactions to confirm
- Use `eth_getTransactionCount` to check current nonce
- Some wallets allow "reset nonce" or "speed up" transactions

---

### Issue: "Insufficient funds for gas"

**Cause:** Wallet doesn't have enough native token for gas.

**Solution:**

- Get testnet ETH from a faucet (Sepolia: https://sepoliafaucet.com)
- For mainnet, transfer ETH to your wallet

---

## Getting Help

1. **Check the docs:**
   - [API Reference](./API.md)
   - [Error Codes](./ERROR_CODES.md)
   - [Hooks Reference](./HOOKS.md)

2. **Search existing issues:**
   - GitHub Issues: https://github.com/anomalyco/kokonut-agentic-marketplace/issues

3. **Debug mode:**

   ```typescript
   // Enable debug logging in browser console
   localStorage.setItem('debug', 'kokonut:*');
   ```

4. **Run diagnostics:**

   ```bash
   # Health check
   curl https://market.kokonut.network/api/health

   # Contract verification
   cast call CONTRACT_ADDRESS "version()" --rpc-url sepolia
   ```

---

## Common Error Codes

| Code               | Message                | Solution               |
| ------------------ | ---------------------- | ---------------------- |
| USER_REJECTED      | Transaction rejected   | Approve in wallet      |
| INSUFFICIENT_FUNDS | Not enough USDC        | Add USDC to wallet     |
| INSUFFICIENT_ETH   | Not enough ETH for gas | Add ETH to wallet      |
| NONCE_MISMATCH     | Nonce error            | Wait and retry         |
| INVALID_AGENT      | Not registered         | Register first         |
| NOT_AUTHORIZED     | Wrong wallet           | Connect correct wallet |
| NETWORK_ERROR      | Connection failed      | Check internet/RPC     |

See [docs/ERROR_CODES.md](./ERROR_CODES.md) for the complete list.
