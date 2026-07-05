# Wallet Setup Guide

## Step 1: Get Your Private Key

### Option A: MetaMask (Most Common)

1. Open MetaMask in your browser
2. Click your account → Account Details
3. Click Export Private Key
4. Enter your password
5. Copy the private key (starts with `0x...`)
6. Keep it secure!

### Option B: Hardware Wallet (Ledger, Trezor)

1. Connect your hardware wallet
2. Open your wallet app
3. Note your account address
4. Use a JSON file or environment variable instead

### Option C: Generate New Wallet

Create a SEPARATE wallet for development:

```bash
node -e "const ethers = require('ethers'); console.log('Private Key:', new ethers.Wallet().privateKey)"
```

---

## Step 2: Get ETH on Sepolia Testnet

You need Sepolia ETH for testing (it's free!)

### Get Testnet ETH

1. Go to: https://faucets.chain.link/sepolia
2. Connect your wallet
3. Request test ETH (takes a few minutes)
4. You should receive ~0.5 Sepolia ETH

### Alternative Faucets

- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

---

## Step 3: Get Etherscan API Key

1. Go to: https://etherscan.io/apidashboard
2. Sign in with your account
3. Click Add API Key
4. Name: "Kokonut Agent Economy Stack"
5. Select Basic (free tier)
6. Copy the key

**Free tier includes:**

- 5 requests/second
- 100,000 calls/day
- Contract verification

---

## Step 4: Configure .env File

Edit the `.env` file in the project root:

```env
# Your private key (DO NOT SHARE!)
PRIVATE_KEY=0x1234567890abcdef...

# Etherscan API key for verification
ETHERSCAN_API_KEY=ABCDEF123456...

# Sepolia RPC URL
ETHEREUM_RPC_URL=https://ethereum-sepolia.publicnode.com
```

---

## Step 5: Install Foundry

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Restart terminal, then:
foundryup
```

Verify installation:

```bash
forge --version
cast --version
```

---

## Quick Checklist

Before deploying, make sure you have:

- [ ] Wallet created
- [ ] Private key copied and secure
- [ ] Etherscan API key obtained
- [ ] `.env` file configured
- [ ] Foundry installed
- [ ] Sepolia ETH in wallet

---

## Security Best Practices

### DO:

- Use a separate wallet for development
- Keep your private key secure
- Test on testnet first
- Rotate keys if compromised

### DON'T:

- Share your private key publicly
- Commit `.env` to Git
- Use main wallet for development
- Store keys in plain text files

---

## Next Steps

Once configured, deploy to Sepolia:

```bash
forge script contracts/script/Deploy.s.sol:DeployCoreScript \
    --rpc-url https://ethereum-sepolia.publicnode.com \
    --broadcast \
    --private-key "$PRIVATE_KEY"
```
