#!/usr/bin/env node

const { readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

const root = join(__dirname, '..');
const manifestPath = join(root, 'config', 'address-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function write(file, contents) {
  writeFileSync(join(root, file), contents);
  console.log(`wrote ${file}`);
}

function renderNetworksTs() {
  return `import manifest from './address-manifest.json';

/**
 * Shared network configuration generated from config/address-manifest.json.
 * Keep contract addresses in the manifest, then run pnpm run generate:addresses.
 */
export const NETWORKS = manifest.networks;

export type NetworkConfig = (typeof NETWORKS)[keyof typeof NETWORKS];
export type ContractAddresses = NetworkConfig['contracts'];
export type NetworkName = keyof typeof NETWORKS;

export function getNetwork(name: NetworkName): NetworkConfig {
  return NETWORKS[name];
}

export function getContracts(name: NetworkName): ContractAddresses {
  return NETWORKS[name].contracts;
}

export function getRpcUrl(name: NetworkName): string {
  return NETWORKS[name].rpcUrl;
}

export const DEFAULT_NETWORK: NetworkName = manifest.defaultNetwork as NetworkName;
`;
}

function renderNetworksJs() {
  return `"use strict";
/**
 * Shared network configuration generated from config/address-manifest.json.
 * Keep contract addresses in the manifest, then run pnpm run generate:addresses.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_NETWORK = exports.NETWORKS = void 0;
exports.getNetwork = getNetwork;
exports.getContracts = getContracts;
exports.getRpcUrl = getRpcUrl;
const manifest = require('./address-manifest.json');
exports.NETWORKS = manifest.networks;
function getNetwork(name) {
    return exports.NETWORKS[name];
}
function getContracts(name) {
    return exports.NETWORKS[name].contracts;
}
function getRpcUrl(name) {
    return exports.NETWORKS[name].rpcUrl;
}
exports.DEFAULT_NETWORK = manifest.defaultNetwork;
`;
}

function validateManifest() {
  if (!manifest.networks || !manifest.defaultNetwork) {
    throw new Error('Invalid address manifest');
  }

  const network = manifest.networks[manifest.defaultNetwork];
  if (!network || !network.contracts) {
    throw new Error(`Missing default network ${manifest.defaultNetwork}`);
  }
}

validateManifest();
write('config/networks.ts', renderNetworksTs());
write('config/networks.js', renderNetworksJs());
