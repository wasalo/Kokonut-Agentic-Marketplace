#!/usr/bin/env node
/**
 * Semantic storage layout checker for UUPS contracts.
 *
 * This compares storage compatibility instead of raw `forge inspect` JSON.
 * Volatile fields such as astId and compiler-internal type IDs are ignored.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const CONTRACTS_DIR = path.join(PROJECT_ROOT, 'contracts');
const args = process.argv.slice(2);
const WRITE_BASELINE = args.includes('--write');
const BASELINE_PATH =
  args.find(arg => arg !== '--write') || path.join(CONTRACTS_DIR, 'storage-layout-baseline.json');

const ACTIVE_UUPS_CONTRACTS = [
  'AgenticCommerceV9',
  'ServiceRegistryV2',
  'AgentSkillRegistryV2',
  'BiddingSystem',
  'MilestoneEscrowV2',
  'PriceOracleV2',
  'CommitReveal',
  'SlashManager',
  'AdminRegistry',
];

const CONTRACT_PATHS = Object.fromEntries(
  ACTIVE_UUPS_CONTRACTS.map(contract => [
    contract,
    `contracts/shared/${contract}.sol:${contract}`,
  ])
);

const ALLOWED_RENAMES = {
  SlashManager: {
    agentReview: 'commerce',
  },
};

function getStorageLayout(contractName) {
  const target = CONTRACT_PATHS[contractName];
  if (!target) throw new Error(`Unknown contract: ${contractName}`);

  const output = execSync(`forge inspect ${target} storage-layout --json`, {
    cwd: PROJECT_ROOT,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(output);
}

function normalizeInteger(value) {
  return Number(value ?? 0);
}

function normalizeContractLabel(label) {
  if (label.startsWith('contract ')) return 'address';
  return label;
}

function semanticType(typeId, types, seen = new Set()) {
  const type = types?.[typeId];
  if (!type) return String(typeId).replace(/\d+/g, '#');

  if (seen.has(typeId)) return normalizeContractLabel(type.label || typeId);
  seen.add(typeId);

  if (type.encoding === 'mapping') {
    return `mapping(${semanticType(type.key, types, seen)}=>${semanticType(type.value, types, seen)})`;
  }

  if (type.encoding === 'dynamic_array') {
    return `${semanticType(type.base, types, seen)}[]`;
  }

  if (type.encoding === 'inplace' && type.base) {
    const match = String(type.label || '').match(/\[(\d+)\]$/);
    return `${semanticType(type.base, types, seen)}[${match ? match[1] : '?'}]`;
  }

  if (Array.isArray(type.members)) {
    const members = type.members.map(member => {
      return `${member.label}@${normalizeInteger(member.slot)}:${normalizeInteger(member.offset)}:${semanticType(member.type, types, new Set(seen))}`;
    });
    return `struct{${members.join(',')}}`;
  }

  return normalizeContractLabel(type.label || typeId);
}

function normalizeLayout(rawLayout) {
  const storage = rawLayout.storage.map(entry => ({
    label: entry.label,
    slot: normalizeInteger(entry.slot),
    offset: normalizeInteger(entry.offset),
    type: semanticType(entry.type, rawLayout.types),
  }));

  return { storage };
}

function parseBaselineEntry(entry) {
  if (entry?.normalized?.storage) return entry.normalized;
  if (entry?.storage) return entry;
  if (typeof entry?.layout === 'string') return normalizeLayout(JSON.parse(entry.layout));
  throw new Error('Unsupported baseline entry format');
}

function getGap(layout) {
  return layout.storage.find(entry => entry.label === '__gap') || null;
}

function gapSize(gap) {
  if (!gap) return 0;
  const match = gap.type.match(/uint256\[(\d+)\]/);
  return match ? Number(match[1]) : 0;
}

function canonicalLabel(contractName, label) {
  const renames = ALLOWED_RENAMES[contractName] || {};
  return renames[label] || label;
}

function splitStructSignature(type) {
  const marker = 'struct{';
  const start = type.indexOf(marker);
  if (start === -1) return null;

  const end = type.lastIndexOf('}');
  if (end === -1 || end < start) return null;

  return {
    prefix: type.slice(0, start + marker.length),
    members: type.slice(start + marker.length, end),
    suffix: type.slice(end),
  };
}

function isTypeCompatible(oldType, currentType) {
  if (oldType === currentType) return true;

  const oldStruct = splitStructSignature(oldType);
  const currentStruct = splitStructSignature(currentType);
  if (!oldStruct || !currentStruct) return false;

  if (oldStruct.prefix !== currentStruct.prefix || oldStruct.suffix !== currentStruct.suffix) {
    return false;
  }

  return (
    currentStruct.members === oldStruct.members ||
    currentStruct.members.startsWith(`${oldStruct.members},`)
  );
}

function compareLayouts(contractName, baseline, current) {
  const issues = [];
  const oldGap = getGap(baseline);
  const currentGap = getGap(current);
  const currentByLabel = new Map(
    current.storage
      .filter(entry => entry.label !== '__gap')
      .map(entry => [entry.label, entry])
  );

  const oldEntries = baseline.storage.filter(entry => entry.label !== '__gap');
  for (const oldEntry of oldEntries) {
    const expectedLabel = canonicalLabel(contractName, oldEntry.label);
    const currentEntry = currentByLabel.get(expectedLabel);
    if (!currentEntry) {
      issues.push(`missing storage variable ${oldEntry.label}`);
      continue;
    }

    if (oldEntry.slot !== currentEntry.slot || oldEntry.offset !== currentEntry.offset) {
      issues.push(
        `${oldEntry.label} moved from ${oldEntry.slot}:${oldEntry.offset} to ${currentEntry.slot}:${currentEntry.offset}`
      );
    }

    if (!isTypeCompatible(oldEntry.type, currentEntry.type)) {
      issues.push(`${oldEntry.label} type changed from ${oldEntry.type} to ${currentEntry.type}`);
    }
  }

  const oldLabels = new Set(oldEntries.map(entry => canonicalLabel(contractName, entry.label)));
  const newEntries = current.storage.filter(entry => entry.label !== '__gap' && !oldLabels.has(entry.label));

  if (newEntries.length > 0) {
    if (!oldGap || !currentGap) {
      issues.push(`new storage variables without a baseline gap: ${newEntries.map(e => e.label).join(', ')}`);
    } else {
      const oldGapEnd = oldGap.slot + gapSize(oldGap);
      const consumedSlots = Math.max(0, currentGap.slot - oldGap.slot);
      const gapDelta = gapSize(oldGap) - gapSize(currentGap);
      const outsideGap = newEntries.filter(entry => entry.slot < oldGap.slot || entry.slot >= oldGapEnd);

      if (outsideGap.length > 0) {
        issues.push(`new variables outside old gap: ${outsideGap.map(e => e.label).join(', ')}`);
      }
      if (consumedSlots > gapDelta) {
        issues.push(`gap size decreased by ${gapDelta}, but current gap moved by ${consumedSlots} slots`);
      }
    }
  }

  return issues;
}

function generateBaseline() {
  const baseline = {
    version: 'semantic-v1',
    generatedAt: new Date().toISOString(),
    contracts: {},
  };

  for (const contract of ACTIVE_UUPS_CONTRACTS) {
    const rawLayout = getStorageLayout(contract);
    baseline.contracts[contract] = {
      target: CONTRACT_PATHS[contract],
      normalized: normalizeLayout(rawLayout),
    };
  }

  fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`Baseline written to ${BASELINE_PATH}`);
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    throw new Error(`No storage layout baseline found at ${BASELINE_PATH}`);
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf-8'));
  const entries = baseline.contracts || baseline;
  if (!entries || typeof entries !== 'object' || Object.keys(entries).length === 0) {
    throw new Error('Storage layout baseline is empty. Regenerate it with --write.');
  }
  return entries;
}

function checkAgainstBaseline() {
  const baseline = loadBaseline();
  let failed = false;

  for (const contract of ACTIVE_UUPS_CONTRACTS) {
    const baselineEntry = baseline[contract];
    if (!baselineEntry) {
      console.log(`❌ ${contract}: Missing storage layout baseline`);
      failed = true;
      continue;
    }

    try {
      const oldLayout = parseBaselineEntry(baselineEntry);
      const currentLayout = normalizeLayout(getStorageLayout(contract));
      const issues = compareLayouts(contract, oldLayout, currentLayout);

      if (issues.length > 0) {
        console.log(`❌ ${contract}: Storage layout incompatible`);
        for (const issue of issues) console.log(`   - ${issue}`);
        failed = true;
      } else {
        console.log(`✅ ${contract}: Storage layout compatible`);
      }
    } catch (error) {
      console.log(`❌ ${contract}: ${error.message}`);
      failed = true;
    }
  }

  return failed;
}

if (require.main === module) {
  try {
    if (WRITE_BASELINE) {
      generateBaseline();
      process.exit(0);
    }

    const failed = checkAgainstBaseline();
    if (failed) {
      console.log('\n⚠️  Storage layout incompatibilities detected.');
      console.log('If reviewed and intentional, regenerate the semantic baseline with:');
      console.log('  node scripts/check-storage-layout.js --write');
      process.exit(1);
    }

    console.log('\n✅ All active storage layouts are compatible with baseline');
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  ACTIVE_UUPS_CONTRACTS,
  CONTRACT_PATHS,
  getStorageLayout,
  normalizeLayout,
  compareLayouts,
  parseBaselineEntry,
};
