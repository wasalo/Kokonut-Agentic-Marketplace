#!/usr/bin/env node
/**
 * Generate a read-only storage/deployment health report for Sepolia UUPS proxies.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  ACTIVE_UUPS_CONTRACTS,
  compareLayouts,
  getStorageLayout,
  normalizeLayout,
  parseBaselineEntry,
} = require('./check-storage-layout');

const PROJECT_ROOT = path.join(__dirname, '..');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'config/address-manifest.json');
const BASELINE_PATH = path.join(PROJECT_ROOT, 'contracts/storage-layout-baseline.json');
const REPORT_PATH = process.argv[2] || path.join(PROJECT_ROOT, 'docs/STORAGE_HEALTH_REPORT.md');
const RPC_URL = process.env.SEPOLIA_RPC_URL || 'https://ethereum-sepolia.publicnode.com';
const IMPLEMENTATION_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

const CONTRACT_KEYS = {
  AgentSkillRegistryV2: ['skillRegistry', 'skillRegistryImpl'],
  ServiceRegistryV2: ['serviceRegistry', 'serviceRegistryImpl'],
  AdminRegistry: ['adminRegistry', 'adminRegistryImpl'],
  AgenticCommerceV9: ['agenticCommerce', 'agenticCommerceImpl'],
  BiddingSystem: ['biddingSystem', 'biddingSystemImpl'],
  PriceOracleV2: ['priceOracle', 'priceOracleImpl'],
  CommitReveal: ['commitReveal', 'commitRevealImpl'],
  SlashManager: ['slashManager', 'slashManagerImpl'],
  MilestoneEscrowV2: ['milestoneEscrow', 'milestoneEscrowImpl'],
};

function run(command) {
  return execSync(command, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function cast(args) {
  return run(`cast ${args} --rpc-url ${RPC_URL}`);
}

function normalizeAddress(value) {
  if (!value || value === '-') return '-';
  const hex = value.trim().toLowerCase();
  if (hex.startsWith('0x') && hex.length === 66) return `0x${hex.slice(-40)}`;
  return hex;
}

function readImplementation(proxy) {
  return normalizeAddress(cast(`storage ${proxy} ${IMPLEMENTATION_SLOT}`));
}

function safeCall(description, command) {
  try {
    return { description, ok: true, value: cast(command).replace(/\n/g, ' ') };
  } catch (error) {
    const message = String(error.stderr || error.message).split('\n')[0];
    return { description, ok: false, value: message };
  }
}

function serviceRecordChecks(proxy, count) {
  const checks = [];
  const safeCount = Number(count);
  if (!Number.isFinite(safeCount) || safeCount <= 0 || safeCount > 100) return checks;

  for (let i = 0; i < safeCount; i++) {
    checks.push(safeCall(
      `getService(${i})`,
      `call ${proxy} 'getService(uint256)((uint256,address,address,uint256,string,string,string,uint256,address,bool,uint256))' ${i}`
    ));
  }
  return checks;
}

function layoutStatus(contract, baselineEntries) {
  try {
    const oldLayout = parseBaselineEntry(baselineEntries[contract]);
    const currentLayout = normalizeLayout(getStorageLayout(contract));
    const issues = compareLayouts(contract, oldLayout, currentLayout);
    return issues.length === 0 ? 'Compatible' : `Incompatible: ${issues.join('; ')}`;
  } catch (error) {
    return `Error: ${error.message}`;
  }
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const baselineRaw = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  const baselineEntries = baselineRaw.contracts || baselineRaw;
  const contracts = manifest.networks.sepolia.contracts;
  const generatedAt = new Date().toISOString();
  const rows = [];
  const details = [];

  for (const contract of ACTIVE_UUPS_CONTRACTS) {
    const [proxyKey, implKey] = CONTRACT_KEYS[contract];
    const proxy = contracts[proxyKey];
    const expectedImpl = contracts[implKey];
    const onchainImpl = proxy ? readImplementation(proxy) : '-';
    const expectedNormalized = normalizeAddress(expectedImpl);
    const implementationStatus = expectedNormalized === onchainImpl ? 'OK' : 'Mismatch';
    const storageStatus = layoutStatus(contract, baselineEntries);

    rows.push({ contract, proxy, expectedImpl, onchainImpl, implementationStatus, storageStatus });
  }

  const serviceProxy = contracts.serviceRegistry;
  const serviceCounter = safeCall('getServiceCounter()', `call ${serviceProxy} 'getServiceCounter()(uint256)'`);
  const serviceActiveCount = safeCall('getActiveServiceCount()', `call ${serviceProxy} 'getActiveServiceCount()(uint256)'`);
  const serviceChecks = [
    serviceCounter,
    serviceActiveCount,
    safeCall('agenticCommerce()', `call ${serviceProxy} 'agenticCommerce()(address)'`),
    safeCall('slashManager()', `call ${serviceProxy} 'slashManager()(address)'`),
    safeCall('adminRegistry()', `call ${serviceProxy} 'adminRegistry()(address)'`),
    ...serviceRecordChecks(serviceProxy, serviceCounter.ok ? serviceCounter.value.match(/\d+/)?.[0] : 0),
  ];
  details.push(['ServiceRegistryV2', serviceChecks]);

  details.push(['AgentSkillRegistryV2', [
    safeCall('getTotalSkillCount()', `call ${contracts.skillRegistry} 'getTotalSkillCount()(uint256)'`),
  ]]);
  details.push(['BiddingSystem', [
    safeCall('getSessionCount()', `call ${contracts.biddingSystem} 'getSessionCount()(uint256)'`),
  ]]);
  details.push(['AgenticCommerceV9', [
    safeCall('jobCounter()', `call ${contracts.agenticCommerce} 'jobCounter()(uint256)'`),
  ]]);
  details.push(['CommitReveal', [
    safeCall('serviceRegistry()', `call ${contracts.commitReveal} 'serviceRegistry()(address)'`),
  ]]);
  details.push(['MilestoneEscrowV2', [
    safeCall('agenticCommerce()', `call ${contracts.milestoneEscrow} 'agenticCommerce()(address)'`),
  ]]);
  details.push(['SlashManager', [
    safeCall('commerce()', `call ${contracts.slashManager} 'commerce()(address)'`),
  ]]);

  const lines = [];
  lines.push('# Storage Health Report');
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push(`Network: Sepolia (${manifest.networks.sepolia.chainId})`);
  lines.push(`RPC: ${RPC_URL}`);
  lines.push('');
  lines.push('## Implementation And Layout Status');
  lines.push('');
  lines.push('| Contract | Proxy | Manifest Impl | On-chain Impl | Impl Status | Layout Status |');
  lines.push('|---|---|---|---|---|---|');
  for (const row of rows) {
    lines.push(`| ${row.contract} | \`${row.proxy}\` | \`${row.expectedImpl}\` | \`${row.onchainImpl}\` | ${row.implementationStatus} | ${row.storageStatus} |`);
  }

  lines.push('');
  lines.push('## Live Sanity Checks');
  for (const [section, checks] of details) {
    lines.push('');
    lines.push(`### ${section}`);
    lines.push('');
    lines.push('| Check | Status | Value |');
    lines.push('|---|---|---|');
    for (const check of checks) {
      lines.push(`| ${check.description} | ${check.ok ? 'OK' : 'FAIL'} | \`${check.value}\` |`);
    }
  }

  lines.push('');
  lines.push('## Notes');
  lines.push('');
  lines.push('- Layout status is based on the semantic checker in `scripts/check-storage-layout.js`.');
  lines.push('- Live sanity checks are read-only `cast call`/storage reads against Sepolia.');
  lines.push('- A failing service record read usually means the individual record is legacy-corrupt, not necessarily that the proxy implementation is unreadable.');
  lines.push('');

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${lines.join('\n')}\n`);
  console.log(`Wrote ${REPORT_PATH}`);
}

main();
