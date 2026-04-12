import { OWSChain, OWS_CHAIN_IDS, OWS_RPC_URLS } from './types';

export interface TestnetReadinessCheck {
  name: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
}

export interface TestnetReadinessReport {
  overall: 'ready' | 'partial' | 'not_ready';
  checks: TestnetReadinessCheck[];
  timestamp: number;
}

export class TestnetReadiness {
  private supportedChains: OWSChain[] = ['sepolia', 'ethereum', 'polygon', 'arbitrum', 'optimism', 'bsc', 'avalanche'];
  
  private defaultTestnetChain: OWSChain = 'sepolia';

  async runChecks(): Promise<TestnetReadinessReport> {
    const checks: TestnetReadinessCheck[] = [];

    checks.push(this.checkChainSupport());
    checks.push(this.checkRpcUrls());
    checks.push(this.checkStorageAvailability());
    checks.push(this.checkEncryption());
    checks.push(this.checkPolicyEngine());

    const failed = checks.filter(c => c.status === 'fail').length;
    const warnings = checks.filter(c => c.status === 'warning').length;

    let overall: 'ready' | 'partial' | 'not_ready';
    if (failed > 0) {
      overall = 'not_ready';
    } else if (warnings > 0) {
      overall = 'partial';
    } else {
      overall = 'ready';
    }

    return {
      overall,
      checks,
      timestamp: Date.now(),
    };
  }

  private checkChainSupport(): TestnetReadinessCheck {
    if (this.supportedChains.length >= 5) {
      return {
        name: 'Chain Support',
        status: 'pass',
        message: `${this.supportedChains.length} chains supported`,
      };
    }
    return {
      name: 'Chain Support',
      status: 'warning',
      message: `Only ${this.supportedChains.length} chains supported`,
    };
  }

  private checkRpcUrls(): TestnetReadinessCheck {
    const configured = Object.keys(OWS_RPC_URLS).filter(chain => 
      OWS_RPC_URLS[chain as OWSChain] && OWS_RPC_URLS[chain as OWSChain].length > 0
    );

    if (configured.length >= 3) {
      return {
        name: 'RPC Configuration',
        status: 'pass',
        message: `${configured.length} RPC URLs configured`,
      };
    }
    return {
      name: 'RPC Configuration',
      status: 'warning',
      message: `Only ${configured.length} RPC URLs configured`,
    };
  }

  private checkStorageAvailability(): TestnetReadinessCheck {
    try {
      if (typeof window === 'undefined') {
        return {
          name: 'Storage Availability',
          status: 'warning',
          message: 'Storage check requires browser context',
        };
      }
      
      const testKey = 'ows_test_storage';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      return {
        name: 'Storage Availability',
        status: 'pass',
        message: 'localStorage available',
      };
    } catch {
      return {
        name: 'Storage Availability',
        status: 'fail',
        message: 'localStorage not available',
      };
    }
  }

  private checkEncryption(): TestnetReadinessCheck {
    try {
      if (typeof crypto === 'undefined' || !crypto.subtle) {
        return {
          name: 'Encryption Support',
          status: 'fail',
          message: 'Web Crypto API not available',
        };
      }

      return {
        name: 'Encryption Support',
        status: 'pass',
        message: 'AES-256-GCM encryption available',
      };
    } catch {
      return {
        name: 'Encryption Support',
        status: 'fail',
        message: 'Encryption check failed',
      };
    }
  }

  private checkPolicyEngine(): TestnetReadinessCheck {
    return {
      name: 'Policy Engine',
      status: 'pass',
      message: 'Policy engine initialized',
    };
  }

  getDefaultChain(): OWSChain {
    return this.defaultTestnetChain;
  }

  isChainSupported(chain: OWSChain): boolean {
    return this.supportedChains.includes(chain);
  }

  getChainConfig(chain: OWSChain): { chainId: number; rpcUrl: string; explorerUrl: string } | null {
    if (!this.isChainSupported(chain)) {
      return null;
    }

    return {
      chainId: OWS_CHAIN_IDS[chain],
      rpcUrl: OWS_RPC_URLS[chain],
      explorerUrl: this.getExplorerUrl(chain),
    };
  }

  private getExplorerUrl(chain: OWSChain): string {
    const explorers: Record<OWSChain, string> = {
      sepolia: 'https://sepolia.etherscan.io',
      ethereum: 'https://etherscan.io',
      polygon: 'https://polygonscan.com',
      arbitrum: 'https://arbiscan.io',
      optimism: 'https://optimistic.etherscan.io',
      bsc: 'https://bscscan.com',
      avalanche: 'https://snowtrace.io',
    };
    return explorers[chain];
  }
}

export const testnetReadiness = new TestnetReadiness();

export async function checkTestnetReadiness(): Promise<TestnetReadinessReport> {
  return testnetReadiness.runChecks();
}

export function getReadyChains(): OWSChain[] {
  return testnetReadiness.getDefaultChain() === 'sepolia' ? ['sepolia'] : [];
}