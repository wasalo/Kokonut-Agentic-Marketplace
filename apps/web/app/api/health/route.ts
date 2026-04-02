import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    walletConnect: false,
    rpc: false,
    contracts: false,
    environment: false,
  };

  try {
    // Check WalletConnect project ID
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    checks.walletConnect =
      !!projectId && projectId !== 'demo' && projectId !== 'your_walletconnect_project_id_here';

    // Check RPC endpoint
    try {
      const rpcUrl =
        process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        }),
        signal: AbortSignal.timeout(5000),
      });
      checks.rpc = response.ok;
    } catch {
      checks.rpc = false;
    }

    // Check contract addresses are configured
    const requiredContracts = [
      'NEXT_PUBLIC_AGENTIC_COMMERCE_ADDRESS',
      'NEXT_PUBLIC_AGENT_REVIEW_ADDRESS',
      'NEXT_PUBLIC_SERVICE_REGISTRY_ADDRESS',
      'NEXT_PUBLIC_SKILL_REGISTRY_ADDRESS',
      'NEXT_PUBLIC_USDC_ADDRESS',
      'NEXT_PUBLIC_8004_REGISTRY_ADDRESS',
    ];
    checks.contracts = requiredContracts.every(key => !!process.env[key]);

    // Check environment variables
    checks.environment = !!(
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID && process.env.NEXT_PUBLIC_8004_API_KEY
    );

    const allHealthy = Object.values(checks).every(Boolean);

    return NextResponse.json(
      {
        status: allHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
        environment: process.env.NODE_ENV || 'development',
        hostname: process.env.HOSTNAME || 'unknown',
      },
      { status: allHealthy ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        checks,
      },
      { status: 500 }
    );
  }
}
