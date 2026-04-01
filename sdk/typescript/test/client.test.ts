/**
 * Kokonut Agent SDK - TypeScript Tests
 * Run with: npx jest shared/sdk/test/
 */

import { NETWORKS, parseUSDC, formatUSDC } from '../types';
import type { SDKConfig, AgentMetadata, ServiceParams, JobParams } from '../types';

describe('NETWORKS', () => {
  it('should have sepolia configuration', () => {
    expect(NETWORKS.sepolia).toBeDefined();
    expect(NETWORKS.sepolia.chainId).toBe(11155111);
    expect(NETWORKS.sepolia.contracts.erc8004Registry).toBe(
      '0x8004A818BFB912233c491871b3d84c89A494BD9e'
    );
  });

  it('should have mainnet configuration', () => {
    expect(NETWORKS.mainnet).toBeDefined();
    expect(NETWORKS.mainnet.chainId).toBe(1);
  });

  it('should have all required contracts', () => {
    const sepolia = NETWORKS.sepolia.contracts;
    expect(sepolia.erc8004Registry).toBeDefined();
    expect(sepolia.erc8004Reputation).toBeDefined();
    expect(sepolia.serviceRegistry).toBeDefined();
    expect(sepolia.agenticCommerce).toBeDefined();
    expect(sepolia.usdc).toBeDefined();
  });
});

describe('parseUSDC', () => {
  it('should parse USDC amounts correctly', () => {
    const result = parseUSDC(1000000n);
    expect(result.raw).toBe(1000000n);
    expect(result.formatted).toBe(1);
  });

  it('should handle decimal USDC amounts', () => {
    const result = parseUSDC(1500000n);
    expect(result.formatted).toBe(1.5);
  });

  it('should handle zero', () => {
    const result = parseUSDC(0n);
    expect(result.formatted).toBe(0);
  });
});

describe('formatUSDC', () => {
  it('should format USDC amounts correctly', () => {
    const result = formatUSDC(1);
    expect(result).toBe(1000000n);
  });

  it('should handle decimal amounts', () => {
    const result = formatUSDC(1.5);
    expect(result).toBe(1500000n);
  });
});

describe('SDKConfig', () => {
  it('should accept partial contract overrides', () => {
    const erc8004Registry = '0x1111111111111111111111111111111111111111' as const;
    const config: SDKConfig = {
      wallet: '0x742d35Cc6634C0532925a3b844Bc9e7595f0d00' as any,
      network: 'sepolia',
      contracts: {
        erc8004Registry,
      },
    };
    expect(config.contracts?.erc8004Registry).toBeDefined();
  });
});

describe('AgentMetadata', () => {
  it('should create metadata with required fields', () => {
    const metadata: AgentMetadata = {
      name: 'TestAgent',
    };

    expect(metadata.name).toBe('TestAgent');
  });

  it('should accept optional fields', () => {
    const metadata: AgentMetadata = {
      name: 'TestAgent',
      capabilities: ['data-analysis', 'web3'],
      endpoints: { https: 'https://api.test.com' },
    };

    expect(metadata.capabilities).toHaveLength(2);
  });
});

describe('ServiceParams', () => {
  it('should accept valid service parameters', () => {
    const params: ServiceParams = {
      agentId: 1n,
      name: 'Test Service',
      description: 'A test service',
      price: 1000000n,
    };

    expect(params.name).toBe('Test Service');
    expect(params.price).toBe(1000000n);
    expect(params.agentId).toBe(1n);
  });

  it('should accept optional fields', () => {
    const params: ServiceParams = {
      agentId: 1n,
      name: 'Test Service',
      description: 'A test service',
      price: 1000000n,
      metadataURI: 'ipfs://QmTest',
      paymentToken: '0x1234567890123456789012345678901234567890' as any,
    };

    expect(params.metadataURI).toBe('ipfs://QmTest');
  });
});

describe('JobParams', () => {
  it('should accept valid job parameters', () => {
    const provider = '0x1111111111111111111111111111111111111111' as const;
    const params: JobParams = {
      provider,
      description: 'Build a smart contract',
    };

    expect(params.provider).toBe(provider);
  });

  it('should accept optional fields', () => {
    const provider = '0x1111111111111111111111111111111111111111' as const;
    const evaluator = '0x2222222222222222222222222222222222222222' as const;
    const params: JobParams = {
      provider,
      evaluator,
      description: 'Build a smart contract',
      expiredAt: 1000000,
    };

    expect(params.evaluator).toBe(evaluator);
  });
});
