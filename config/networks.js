"use strict";
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
