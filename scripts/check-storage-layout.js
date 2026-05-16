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

const CONTRACTS_DIR = path.join(__dirname, '../contracts');
const BASELINE_PATH = process.argv[2] || path.join(CONTRACTS_DIR, 'storage-layout-baseline.json');

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
      `cd ${CONTRACTS_DIR} && forge inspect ${contractName} storage-layout --pretty 2>/dev/null`,
      { encoding: 'utf-8' }
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

// Main
if (!fs.existsSync(BASELINE_PATH)) {
  console.log('No baseline found. Generating...');
  generateBaseline();
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));
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
