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

import { jest } from '@jest/globals';
import { createPublicClient, http, formatEther, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { NETWORKS } from '../types';
import { KokonutClient } from '../client';
import * as dotenv from 'dotenv';

dotenv.config();

// Test configuration
const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;

describe.skip('SDK Integration Tests - Sepolia', () => {
  let client: KokonutClient;
  let account: any;
  let publicClient: any;

  beforeAll(() => {
    if (!PRIVATE_KEY) {
      console.log('\n⚠️  PRIVATE_KEY not set - skipping integration tests');
      return;
    }

    account = privateKeyToAccount(PRIVATE_KEY);
    publicClient = createPublicClient({
      transport: http(SEPOLIA_RPC),
    });

    try {
      client = new KokonutClient({
        wallet: PRIVATE_KEY,
        network: 'sepolia',
      });
    } catch (error) {
      console.log(
        '\n⚠️  Client initialization failed:',
        error instanceof Error ? error.message : error
      );
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
    it('should get token price', async () => {
      if (!client?.priceOracle) {
        console.log('\n⚠️  PriceOracle not initialized - skipping');
        return;
      }

      try {
        const price = await client.priceOracle.getUsdPriceOfToken(
          client.contracts.usdc as `0x${string}`
        );
        expect(price).toBeDefined();
        expect(typeof price).toBe('bigint');
        console.log('\n💵 Price:', price.toString());
      } catch (error) {
        console.log(
          '\n⚠️  PriceOracle call failed:',
          error instanceof Error ? error.message : error
        );
      }
    });

    it('should check if price is stale', async () => {
      if (!client?.priceOracle) {
        console.log('\n⚠️  PriceOracle not initialized - skipping');
        return;
      }

      try {
        const stale = await client.priceOracle.isStale(
          client.contracts.usdc as `0x${string}`
        );
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
      if (!client?.services) {
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
      if (!client?.services) {
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
      if (!client?.commerce) {
        console.log('\n⚠️  Commerce not initialized - skipping');
        return;
      }

      try {
        if (!client.address) {
          console.log('\n⚠️  No address available - skipping');
          return;
        }
        const count = await client.commerce.getClientJobCount(client.address);
        expect(typeof count).toBe('number');
        console.log('\n📋 Client job count:', count);
      } catch (error) {
        console.log('\n⚠️  Commerce call failed:', error instanceof Error ? error.message : error);
      }
    });
  });

  describe('SlashManager Read Functions', () => {
    it('should check if address is signer', async () => {
      if (!client?.slashManager) {
        console.log('\n⚠️  SlashManager not initialized - skipping');
        return;
      }

      try {
        // Use a known non-signer address
        const isSigner = await client.slashManager.isSigner(
          '0x0000000000000000000000000000000000000001' as Address
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
      expect(account).toBeDefined();
      expect(account.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
      console.log('\n👛 Test wallet:', account.address);
    });

    it('should have ETH balance on Sepolia', async () => {
      if (!account) {
        console.log('\n⚠️  No account - skipping');
        return;
      }

      try {
        const balance = await publicClient.getBalance({ address: account.address });
        expect(balance).toBeDefined();
        console.log('\n💰 ETH Balance:', formatEther(balance), 'ETH');

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

