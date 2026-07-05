/**
 * @file ServiceRegistryV2 bond constants
 * @description Single source of truth for service listing bond amounts and cooldowns.
 * Imported by ServiceBondStatus, ProviderServiceActions, useServices, marketplace/create,
 * and marketplace/[id]. If a bond amount ever changes, update here and every consumer
 * picks it up automatically.
 */
import { parseEther } from 'viem';

/** Native-ETH bond required to list a service on ServiceRegistryV2. */
export const SERVICE_BOND_AMOUNT = parseEther('0.01');

/** Cooldown period after `deactivateService` during which the bond is locked before `withdrawServiceBond` becomes available. */
export const SERVICE_BOND_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
