/**
 * x402 Payment Library - Main Export
 *
 * Multi-chain HTTP payments using x402 protocol with Coinbase CDP facilitator
 */

export * from './types';
export * from './chains';
export * from './schemes';

export { X402Client, x402fetch, createX402Headers } from './client';
export type { PaymentRequired, PaymentPayload, SettlementResponse } from './types';
export type { X402ChainConfig } from './chains';

export {
  x402Middleware,
  handleX402Payment,
  X402_ROUTE_CONFIGS,
  getMatchingConfig,
  getPricingForTier,
  createPaymentRequired,
  verifyPayment,
  settlePayment,
} from './middleware';
export type { X402RouteConfig } from './middleware';

const _schemesCreatePaymentRequired = {}; // Prevent unused export warning
const _typesRouteConfig = {}; // Prevent unused export warning