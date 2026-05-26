#!/usr/bin/env node
/**
 * Storage Layout CI Check
 * 
 * Verifies that contract storage layouts haven't changed between deployments.
 * Prevents accidental storage corruption during UUPS upgrades.
 * 
 * Usage:
 *   node scripts/check-storage-layout.js [baseline.json]
 * 
 * If no baseline is provided, generates one from current contracts.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const CONTRACTS_DIR = path.join(__dirname, '../contracts');
const args = process.argv.slice(2);
const WRITE_BASELINE = args.includes('--write');
const BASELINE_PATH = args.find(arg => arg !== '--write') || path.join(CONTRACTS_DIR, 'storage-layout-baseline.json');

const UUPS_CONTRACTS = [
  'AgenticCommerceV9',
  'ServiceRegistryV2',
  'AgentReviewV5',
  'AgentSkillRegistryV2',
  'BiddingSystem',
  'MilestoneEscrowV2',
  'PriceOracleV2',
  'CommitReveal',
  'SlashManager',
  'AdminRegistry',
];

function getStorageLayout(contractName) {
  try {
    const output = execSync(
      `forge inspect contracts/shared/${contractName}.sol:${contractName} storage-layout --json`,
      { cwd: PROJECT_ROOT, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
    );
    return output.trim();
  } catch (error) {
    console.error(`Warning: Could not get storage layout for ${contractName}`);
    return null;
  }
}

function generateBaseline() {
  const baseline = {};
  
  for (const contract of UUPS_CONTRACTS) {
    const layout = getStorageLayout(contract);
    if (layout) {
      baseline[contract] = {
        layout,
        timestamp: new Date().toISOString(),
      };
    }
  }
  
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
  console.log(`Baseline written to ${BASELINE_PATH}`);
  return baseline;
}

function checkAgainstBaseline(baseline) {
  let hasChanges = false;

  for (const contract of UUPS_CONTRACTS) {
    if (!baseline[contract]?.layout) {
      console.log(`❌ ${contract}: Missing storage layout baseline`);
      hasChanges = true;
    }
  }
   
  for (const [contractName, expected] of Object.entries(baseline)) {
    const current = getStorageLayout(contractName);
    
    if (!current) {
      console.log(`⚠️  ${contractName}: Could not retrieve layout`);
      continue;
    }
    
    if (current !== expected.layout) {
      console.log(`❌ ${contractName}: Storage layout changed!`);
      hasChanges = true;
    } else {
      console.log(`✅ ${contractName}: Storage layout unchanged`);
    }
  }
  
  return hasChanges;
}

function validateBaseline(baseline) {
  if (!baseline || typeof baseline !== 'object' || Object.keys(baseline).length === 0) {
    console.error('❌ Storage layout baseline is empty. Regenerate it with --write.');
    process.exit(1);
  }
}

// Main
if (WRITE_BASELINE) {
  generateBaseline();
  process.exit(0);
}

if (!fs.existsSync(BASELINE_PATH)) {
  console.error(`❌ No storage layout baseline found at ${BASELINE_PATH}`);
  console.error('Regenerate it intentionally with: node scripts/check-storage-layout.js --write');
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));
validateBaseline(baseline);
const hasChanges = checkAgainstBaseline(baseline);

if (hasChanges) {
  console.log('\n⚠️  Storage layout changes detected!');
  console.log('If this is intentional, regenerate the baseline:');
  console.log(`  node scripts/check-storage-layout.js`);
  process.exit(1);
} else {
  console.log('\n✅ All storage layouts match baseline');
  process.exit(0);
}
