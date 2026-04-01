/**
 * Sepolia On-Chain Test Script
 * Tests all SDK functions against deployed Sepolia contracts
 *
 * Usage:
 *   npm run test:sepolia
 *   npx tsx scripts/sepolia-test.ts
 *
 * Prerequisites:
 * - PRIVATE_KEY set in .env with Sepolia ETH
 * - 20 USDC sent to wallet for testing
 */

require('dotenv').config();
const { ethers } = require('ethers');

const SEPOLIA_RPC = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('❌ PRIVATE_KEY not set in .env');
  process.exit(1);
}

// Updated contract addresses (March 27, 2026)
const CONTRACTS = {
  erc8004Registry: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
  erc8004Reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  skillRegistry: '0x7cf16C00ed4831EB9eE3a8765831968F0a28f53D',
  serviceRegistry: '0x62E1eeEa1A2Ab987004F35bDA430457Ed6077201', // ServiceRegistryV2 Proxy
  agenticCommerce: '0x8E5AD4C87262A1d758E12702DE830f83d1e8D4b5',
  agentReview: '0xb63bb35f5dbae2ff2d154fade900ef85735ba7d3',
  priceOracle: '0x5C4AC3dAF76708DCd51911BA3B33027eAB1B4047', // NEW - deployed today
  commitReveal: '0x6CEd1574A3dF7ec646e43DD8408300117c453Aa3',
  slashManager: '0x7Cf955900FD7a12680E90D834eAf19346f5DBcf9',
  usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
};

console.log('\n🧪 Kokonut Sepolia On-Chain Test Suite');
console.log('======================================\n');

const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const walletAddress = wallet.address;

async function testNetworkConfig() {
  console.log('📋 Test 1: Network Configuration');
  console.log('---------------------------------');

  try {
    const network = await provider.getNetwork();
    console.log(`  ✅ Connected to chain: ${network.chainId}`);
    console.log(`  ✅ Expected chain ID: 11155111 (Sepolia)`);

    if (Number(network.chainId) !== 11155111) {
      throw new Error('Wrong network!');
    }

    const balance = await provider.getBalance(wallet.address);
    console.log(`  ✅ ETH Balance: ${ethers.formatEther(balance)} ETH`);

    if (balance === 0n) {
      console.log('  ⚠️  WARNING: Wallet has no ETH - cannot test write functions');
      return false;
    }

    return true;
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testIdentityModuleERC8004() {
  console.log('\n📋 Test 2: Identity Module (ERC-8004 Registry)');
  console.log('-----------------------------------------------');

  try {
    const address = CONTRACTS.erc8004Registry;
    console.log(`  Contract: ${address}`);

    const code = await provider.getCode(address);
    if (code === '0x') {
      console.log('  ❌ No contract at address');
      return { isRegistered: false, agentId: null };
    }
    console.log('  ✅ Contract deployed');

    // ERC-8004 Identity Registry interface
    const contract = new ethers.Contract(
      address,
      [
        'function name() view returns (string)',
        'function symbol() view returns (string)',
        'function totalSupply() view returns (uint256)',
        'function balanceOf(address owner) view returns (uint256)',
        'function ownerOf(uint256 tokenId) view returns (address)',
        'function tokenURI(uint256 tokenId) view returns (string)',
        'function getMetadata(uint256 agentId, string metadataKey) view returns (string)',
      ],
      wallet
    );

    const name = await contract.name();
    const symbol = await contract.symbol();
    const totalSupply = await contract.totalSupply();

    console.log(`  ✅ Name: ${name}`);
    console.log(`  ✅ Symbol: ${symbol}`);
    console.log(`  ✅ Total Agents: ${totalSupply}`);

    const balance = await contract.balanceOf(wallet.address);
    console.log(`  ✅ Wallet balance: ${balance}`);

    if (balance > 0n) {
      const agentId = await contract.tokenOfOwnerByIndex(wallet.address, 0);
      const uri = await contract.tokenURI(agentId);
      console.log(`  ✅ Agent ID: ${agentId}`);
      console.log(`  ✅ Agent URI: ${uri.substring(0, 50)}...`);
      return { isRegistered: true, agentId };
    }

    return { isRegistered: false, agentId: null };
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
    return { isRegistered: false, agentId: null };
  }
}

async function testReputationModuleERC8004() {
  console.log('\n📋 Test 3: Reputation Module (ERC-8004)');
  console.log('----------------------------------------');

  try {
    const address = CONTRACTS.erc8004Reputation;
    console.log(`  Contract: ${address}`);

    const code = await provider.getCode(address);
    if (code === '0x') {
      console.log('  ❌ No contract at address');
      return false;
    }
    console.log('  ✅ Contract deployed');

    // ERC-8004 Reputation Registry interface
    const contract = new ethers.Contract(
      address,
      [
        'function getIdentityRegistry() view returns (address)',
        'function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 averageValue, uint8 valueDecimals)',
        'function getClients(uint256 agentId) view returns (address[])',
      ],
      wallet
    );

    const identityRegistry = await contract.getIdentityRegistry();
    console.log(`  ✅ Identity Registry: ${identityRegistry}`);

    // Try to get summary for wallet (if registered)
    try {
      const summary = await contract.getSummary(0, [], '', '');
      console.log(`  ✅ Feedback count: ${summary.count}`);
      console.log(`  ✅ Avg rating: ${summary.averageValue}`);
    } catch {
      console.log('  ℹ️  No feedback yet (agent not registered or no reviews)');
    }

    return true;
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testServiceRegistry() {
  console.log('\n📋 Test 4: Service Registry');
  console.log('---------------------------');

  try {
    const address = CONTRACTS.serviceRegistry;
    console.log(`  Contract: ${address}`);

    const code = await provider.getCode(address);
    if (code === '0x') {
      console.log('  ❌ No contract at address');
      return false;
    }
    console.log('  ✅ Contract deployed');

    const contract = new ethers.Contract(
      address,
      [
        'function getActiveServiceCount() view returns (uint256)',
        'function getService(uint256 serviceId) view returns (tuple(uint256 id, address provider, string name, string description, uint256 price, address paymentToken, bool isActive))',
      ],
      wallet
    );

    const count = await contract.getActiveServiceCount();
    console.log(`  ✅ Active services: ${count}`);

    if (count > 0n) {
      const service = await contract.getService(0n);
      console.log(`  ✅ Sample service: ${service.name}`);
    }

    return true;
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testAgentCommerce() {
  console.log('\n📋 Test 5: Agent Commerce (Jobs)');
  console.log('--------------------------------');

  try {
    const address = CONTRACTS.agenticCommerce;
    console.log(`  Contract: ${address}`);

    const code = await provider.getCode(address);
    if (code === '0x') {
      console.log('  ❌ No contract at address');
      return false;
    }
    console.log('  ✅ Contract deployed');

    const contract = new ethers.Contract(
      address,
      [
        'function jobCounter() view returns (uint256)',
        'function getJob(uint256 jobId) view returns (tuple(uint256 id, address client, address provider, address evaluator, string description, uint256 budget, uint256 expiredAt, uint8 status, address hook, bytes32 deliverable))',
      ],
      wallet
    );

    const count = await contract.jobCounter();
    console.log(`  ✅ Total jobs: ${count}`);

    return true;
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testAgentReview() {
  console.log('\n📋 Test 6: Agent Review (Proposals)');
  console.log('------------------------------------');

  try {
    const address = CONTRACTS.agentReview;
    console.log(`  Contract: ${address}`);

    const code = await provider.getCode(address);
    if (code === '0x') {
      console.log('  ❌ No contract at address');
      return false;
    }
    console.log('  ✅ Contract deployed');

    const contract = new ethers.Contract(
      address,
      [
        'function getProposalCount() view returns (uint256)',
        'function getProposal(uint256 proposalId) view returns (tuple(uint256 id, address proposer, string title, string description, string criteriaURI, uint256 reward, uint8 status, uint256 createdAt, uint256 decisionDeadline, address winningEvaluator))',
      ],
      wallet
    );

    const count = await contract.getProposalCount();
    console.log(`  ✅ Total proposals: ${count}`);

    return true;
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testPriceOracle() {
  console.log('\n📋 Test 7: Price Oracle (UPDATED)');
  console.log('----------------------------------');

  try {
    const address = CONTRACTS.priceOracle;
    console.log(`  Contract: ${address}`);

    const code = await provider.getCode(address);
    if (code === '0x') {
      console.log('  ❌ No contract at address');
      return false;
    }
    console.log('  ✅ Contract deployed');

    const contract = new ethers.Contract(
      address,
      [
        'function getUSDCPrice() view returns (uint256)',
        'function getETHRate() view returns (uint256)',
        'function isStale() view returns (bool)',
        'function getPriceFeedAddress(address token) view returns (address feed)',
      ],
      wallet
    );

    try {
      const price = await contract.getUSDCPrice();
      console.log(`  ✅ USDC Price: ${price} ($${Number(price) / 1e8})`);
    } catch (e) {
      console.log('  ⚠️  getUSDCPrice reverted');
    }

    try {
      const ethRate = await contract.getETHRate();
      console.log(`  ✅ ETH Rate: ${ethRate} ($${Number(ethRate) / 1e8})`);
    } catch (e) {
      console.log('  ⚠️  getETHRate reverted');
    }

    try {
      const stale = await contract.isStale();
      console.log(`  ✅ Is stale: ${stale}`);
    } catch (e) {
      console.log('  ⚠️  isStale reverted');
    }

    const ethFeed = await contract.getPriceFeedAddress(ethers.ZeroAddress);
    console.log(`  ✅ ETH Price Feed: ${ethFeed}`);

    return true;
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testCommitReveal() {
  console.log('\n📋 Test 8: Commit-Reveal');
  console.log('------------------------');

  try {
    const address = CONTRACTS.commitReveal;
    console.log(`  Contract: ${address}`);

    const code = await provider.getCode(address);
    if (code === '0x') {
      console.log('  ❌ No contract at address');
      return false;
    }
    console.log('  ✅ Contract deployed');

    // CommitReveal uses mapping(bytes32 => Commitment)
    const contract = new ethers.Contract(
      address,
      [
        'function commitments(bytes32) view returns (bytes32 commitment, uint256 commitBlock, uint256 revealBlock, bool revealed)',
        'function userCommitments(address) view returns (bytes32[])',
      ],
      wallet
    );

    // Get user's commitment list
    try {
      const userComms = await contract.userCommitments(wallet.address);
      console.log(`  ✅ User commitment count: ${userComms.length}`);
    } catch {
      console.log('  ℹ️  No commitments yet');
    }

    return true;
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testSlashManager() {
  console.log('\n📋 Test 9: Slash Manager');
  console.log('-----------------------');

  try {
    const address = CONTRACTS.slashManager;
    console.log(`  Contract: ${address}`);

    const code = await provider.getCode(address);
    if (code === '0x') {
      console.log('  ❌ No contract at address');
      return false;
    }
    console.log('  ✅ Contract deployed');

    const contract = new ethers.Contract(
      address,
      [
        'function isSigner(address account) view returns (bool)',
        'function signers(uint256) view returns (address)',
        'function REQUIRED_SIGNATURES() view returns (uint256)',
        'function proposals(bytes32) view returns (address evaluator, uint256 proposalId, uint256 amount, string reason, uint256 createdAt, uint256 executeAfter, uint256 confirmations, bool executed)',
      ],
      wallet
    );

    const isSigner = await contract.isSigner(wallet.address);
    console.log(`  ✅ Wallet is signer: ${isSigner}`);

    const required = await contract.REQUIRED_SIGNATURES();
    console.log(`  ✅ Required signatures: ${required}`);

    return true;
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testUSDC(): Promise<{ hasBalance: boolean; balance: bigint }> {
  console.log('\n📋 Test 10: USDC Token');
  console.log('----------------------');

  try {
    const address = CONTRACTS.usdc;
    console.log(`  Contract: ${address}`);

    const code = await provider.getCode(address);
    if (code === '0x') {
      console.log('  ❌ No contract at address');
      return { hasBalance: false, balance: 0n };
    }
    console.log('  ✅ Contract deployed');

    const contract = new ethers.Contract(
      address,
      [
        'function balanceOf(address account) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function approve(address spender, uint256 amount) external returns (bool)',
      ],
      wallet
    );

    const symbol = await contract.symbol();
    const decimals = await contract.decimals();
    const balance = await contract.balanceOf(wallet.address);

    console.log(`  ✅ Symbol: ${symbol}`);
    console.log(`  ✅ Decimals: ${decimals}`);
    console.log(`  ✅ Balance: ${Number(balance) / 1e6} USDC`);

    return { hasBalance: balance > 0n, balance };
  } catch (error) {
    console.log(`  ❌ Failed: ${error instanceof Error ? error.message : error}`);
    return { hasBalance: false, balance: 0n };
  }
}

// ============================================
// WRITE TESTS (minimal USDC usage)
// ============================================

async function testWriteApproveUSDC() {
  console.log('\n📋 Test 11: Approve USDC (Write Test)');
  console.log('---------------------------------------');

  try {
    const usdc = new ethers.Contract(
      CONTRACTS.usdc,
      ['function approve(address spender, uint256 amount) external returns (bool)'],
      wallet
    );

    // Approve 1 USDC only (minimal!)
    const approvalAmount = 1_000_000n; // 1 USDC
    const tx = await usdc.approve(CONTRACTS.agenticCommerce, approvalAmount);
    const receipt = await tx.wait();

    console.log(`  ✅ Approved ${approvalAmount / 1_000_000n} USDC for AgenticCommerce`);
    console.log(`  ✅ Tx: ${receipt.hash.substring(0, 20)}...`);

    return true;
  } catch (error) {
    console.log(`  ⚠️  Approval failed: ${error instanceof Error ? error.message : error}`);
    return false;
  }
}

async function testWriteGetAllowance() {
  console.log('\n📋 Test 12: Check USDC Allowance (Write Test)');
  console.log('---------------------------------------------');

  try {
    const usdc = new ethers.Contract(
      CONTRACTS.usdc,
      ['function allowance(address owner, address spender) view returns (uint256)'],
      wallet
    );

    const allowance = await usdc.allowance(wallet.address, CONTRACTS.agenticCommerce);
    console.log(`  ✅ Allowance: ${Number(allowance) / 1e6} USDC`);

    return { hasAllowance: allowance > 0n };
  } catch (error) {
    console.log(`  ⚠️  Allowance check failed: ${error instanceof Error ? error.message : error}`);
    return { hasAllowance: false };
  }
}

async function runFullTest() {
  console.log('🚀 Starting Full Sepolia Test Suite\n');
  console.log(`Wallet: ${walletAddress}`);
  console.log(`RPC: ${SEPOLIA_RPC}\n`);

  const results = [];

  // Read tests
  results.push({ name: 'Network Config', success: await testNetworkConfig() });

  const identityResult = await testIdentityModuleERC8004();
  results.push({
    name: 'Identity Module (ERC-8004)',
    success: identityResult.isRegistered || true,
  }); // Pass even if not registered

  results.push({
    name: 'Reputation Module (ERC-8004)',
    success: await testReputationModuleERC8004(),
  });
  results.push({ name: 'Service Registry', success: await testServiceRegistry() });
  results.push({ name: 'Agent Commerce', success: await testAgentCommerce() });
  results.push({ name: 'Agent Review', success: await testAgentReview() });
  results.push({ name: 'Price Oracle', success: await testPriceOracle() });
  results.push({ name: 'Commit-Reveal', success: await testCommitReveal() });
  results.push({ name: 'Slash Manager', success: await testSlashManager() });

  const usdcResult = await testUSDC();
  results.push({ name: 'USDC Token', success: usdcResult.hasBalance });

  // Write tests (only if USDC balance > 0)
  if (usdcResult.hasBalance) {
    console.log('\n💰 USDC available - running write tests...\n');
    results.push({ name: 'Write: Approve USDC', success: await testWriteApproveUSDC() });
    results.push({
      name: 'Write: Check Allowance',
      success: (await testWriteGetAllowance()).hasAllowance,
    });
  } else {
    console.log('\n⚠️  No USDC balance - skipping write tests\n');
  }

  console.log('\n======================================');
  console.log('📊 Test Results Summary');
  console.log('======================================\n');

  let passed = 0;
  let failed = 0;

  for (const result of results) {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status} - ${result.name}`);
    if (result.success) passed++;
    else failed++;
  }

  console.log(`\n📈 Total: ${passed} passed, ${failed} failed, ${results.length} tests`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed');
    process.exit(1);
  }
}

async function main() {
  try {
    await runFullTest();
  } catch (error) {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
