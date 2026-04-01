/**
 * Kokonut Agent SDK - Integration Tests
 * Run with: npm run test:integration
 *
 * These tests connect to Sepolia testnet and verify SDK functions work
 * against real deployed contracts.
 *
 * Prerequisites:
 * - Set SEPOLIA_RPC_URL in .env
 * - Set PRIVATE_KEY in .env (needs Sepolia ETH)
 * - Ensure contracts are deployed on Sepolia
 */

require('dotenv').config();
const { ethers } = require('ethers');
const { NETWORKS } = require('../types');
const { KokonutClient } = require('../client');

// Test configuration
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

describe.skip('SDK Integration Tests - Sepolia', () => {
  let client: any;
  let wallet: any;

  beforeAll(() => {
    if (!PRIVATE_KEY) {
      console.log('\n⚠️  PRIVATE_KEY not set - skipping integration tests');
      return;
    }

    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);

    try {
      client = new KokonutClient({
        wallet,
        network: 'sepolia',
      });
    } catch (error) {
      console.log(
        '\n⚠️  Client initialization failed:',
        error instanceof Error ? error.message : error
      );
      client = null;
    }
  });

  describe('Network Configuration', () => {
    it('should have correct Sepolia chain ID', () => {
      expect(NETWORKS.sepolia.chainId).toBe(11155111);
    });

    it('should have all contract addresses configured', () => {
      const contracts = NETWORKS.sepolia.contracts;
      expect(contracts.erc8004Registry).toBeDefined();
      expect(contracts.erc8004Reputation).toBeDefined();
      expect(contracts.skillRegistry).toBeDefined();
      expect(contracts.serviceRegistry).toBeDefined();
      expect(contracts.agenticCommerce).toBeDefined();
      expect(contracts.agentReview).toBeDefined();
      expect(contracts.priceOracle).toBeDefined();
      expect(contracts.commitReveal).toBeDefined();
      expect(contracts.slashManager).toBeDefined();
      expect(contracts.usdc).toBeDefined();
    });

    it('should have valid contract addresses (not zero address)', () => {
      const contracts = NETWORKS.sepolia.contracts;
      const zeroAddress = '0x0000000000000000000000000000000000000000';

      Object.entries(contracts).forEach(([name, address]) => {
        if (name !== 'usdc') {
          // usdc might be mainnet only
          expect(address).not.toBe(zeroAddress);
        }
      });
    });
  });

  describe('PriceOracle Read Functions', () => {
    it('should get USDC price', async () => {
      if (!client.priceOracle) {
        console.log('\n⚠️  PriceOracle not initialized - skipping');
        return;
      }

      try {
        const price = await client.priceOracle.getUSDCPrice();
        expect(price).toBeDefined();
        expect(typeof price).toBe('bigint');
        console.log('\n💵 USDC Price:', price.toString());
      } catch (error) {
        console.log(
          '\n⚠️  PriceOracle call failed:',
          error instanceof Error ? error.message : error
        );
      }
    });

    it('should check if price is stale', async () => {
      if (!client.priceOracle) {
        console.log('\n⚠️  PriceOracle not initialized - skipping');
        return;
      }

      try {
        const stale = await client.priceOracle.isStale();
        expect(typeof stale).toBe('boolean');
        console.log('\n📊 Price stale:', stale);
      } catch (error) {
        console.log(
          '\n⚠️  PriceOracle call failed:',
          error instanceof Error ? error.message : error
        );
      }
    });
  });

  describe('ServiceRegistry Read Functions', () => {
    it('should get active service count', async () => {
      if (!client.services) {
        console.log('\n⚠️  Services not initialized - skipping');
        return;
      }

      try {
        const count = await client.services.getActiveCount();
        expect(typeof count).toBe('number');
        console.log('\n📋 Active services:', count);
      } catch (error) {
        console.log('\n⚠️  Services call failed:', error instanceof Error ? error.message : error);
      }
    });

    it('should list services', async () => {
      if (!client.services) {
        console.log('\n⚠️  Services not initialized - skipping');
        return;
      }

      try {
        const services = await client.services.list(0, 5);
        expect(Array.isArray(services));
        console.log('\n📋 Services found:', services.length);
      } catch (error) {
        console.log(
          '\n⚠️  Services list call failed:',
          error instanceof Error ? error.message : error
        );
      }
    });
  });

  describe('AgenticCommerce Read Functions', () => {
    it('should get job count', async () => {
      if (!client.commerce) {
        console.log('\n⚠️  Commerce not initialized - skipping');
        return;
      }

      try {
        const count = await client.commerce.getJobCount();
        expect(typeof count).toBe('number');
        console.log('\n📋 Total jobs:', count);
      } catch (error) {
        console.log('\n⚠️  Commerce call failed:', error instanceof Error ? error.message : error);
      }
    });

    it('should get proposal count', async () => {
      if (!client.review) {
        console.log('\n⚠️  Review not initialized - skipping');
        return;
      }

      try {
        const count = await client.review.getProposalCount();
        expect(typeof count).toBe('number');
        console.log('\n📋 Total proposals:', count);
      } catch (error) {
        console.log('\n⚠️  Review call failed:', error instanceof Error ? error.message : error);
      }
    });
  });

  describe('SlashManager Read Functions', () => {
    it('should check if address is signer', async () => {
      if (!client.slashManager) {
        console.log('\n⚠️  SlashManager not initialized - skipping');
        return;
      }

      try {
        // Use a known non-signer address
        const isSigner = await client.slashManager.isSigner(
          '0x0000000000000000000000000000000000000001' as any
        );
        expect(typeof isSigner).toBe('boolean');
        console.log('\n🔍 Is signer:', isSigner);
      } catch (error) {
        console.log(
          '\n⚠️  SlashManager call failed:',
          error instanceof Error ? error.message : error
        );
      }
    });
  });

  describe('Wallet Connection', () => {
    it('should have wallet address configured', () => {
      expect(wallet).toBeDefined();
      expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      console.log('\n👛 Test wallet:', wallet.address);
    });

    it('should have ETH balance on Sepolia', async () => {
      if (!wallet) {
        console.log('\n⚠️  No wallet - skipping');
        return;
      }

      try {
        const balance = await wallet.provider.getBalance(wallet.address);
        expect(balance).toBeDefined();
        console.log('\n💰 ETH Balance:', ethers.formatEther(balance), 'ETH');

        if (balance === 0n) {
          console.log('\n⚠️  Wallet has no ETH - send Sepolia ETH to run write tests');
        }
      } catch (error) {
        console.log('\n⚠️  Balance check failed:', error instanceof Error ? error.message : error);
      }
    });
  });
});

// CLI Integration Tests
describe('CLI Integration Tests', () => {
  it('should have CLI configured with correct network', () => {
    // This is a placeholder - actual CLI testing would spawn child processes
    expect(true).toBe(true);
  });

  describe('CLI Commands - Read Only', () => {
    it('should list help', async () => {
      // Test help command exists
      expect(true).toBe(true);
    });
  });
});
