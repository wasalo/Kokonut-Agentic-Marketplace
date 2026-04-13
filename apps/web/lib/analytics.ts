declare global {
  interface Window {
    mixpanel: any;
  }
}

let mixpanel: any = null;

export async function initMixpanel(token: string) {
  if (typeof window === 'undefined') return;

  if (!mixpanel && token) {
    try {
      // Use dynamic import for webpack compatibility
      const mp = await import('mixpanel-browser');
      mixpanel = mp.init(token, {
        debug: process.env.NODE_ENV === 'development',
        track_pageview: true,
        persistence: 'localStorage',
      });
      window.mixpanel = mixpanel;
    } catch (e) {
      console.warn('Mixpanel initialization failed:', e);
    }
  }
}

export function trackPageView(path: string) {
  if (mixpanel) {
    mixpanel.track('page_view', { path });
  }
}

export function trackEvent(event: string, properties?: Record<string, any>) {
  if (mixpanel) {
    mixpanel.track(event, {
      ...properties,
      timestamp: new Date().toISOString(),
    });
  }
}

export function identifyUser(address: string, properties?: Record<string, any>) {
  if (mixpanel && address) {
    mixpanel.identify(address.toLowerCase());
    mixpanel.people.set({
      $address: address,
      ...properties,
    });
  }
}

export function resetUser() {
  if (mixpanel) {
    mixpanel.reset();
  }
}

// Event tracking helpers
export const AnalyticsEvents = {
  // Wallet events
  walletConnected: (address: string, chainId: number) =>
    trackEvent('wallet_connected', { address, chainId }),
  walletDisconnected: () => trackEvent('wallet_disconnected'),
  walletSwitched: (chainId: number) => trackEvent('wallet_switched', { chainId }),

  // Agent events
  agentRegistered: (agentId: number) => trackEvent('agent_registered', { agentId }),
  agentViewed: (agentId: number) => trackEvent('agent_viewed', { agentId }),

  // Service events
  serviceCreated: (serviceId: number) => trackEvent('service_created', { serviceId }),
  serviceViewed: (serviceId: number) => trackEvent('service_viewed', { serviceId }),

  // Marketplace events
  marketplaceViewed: () => trackEvent('marketplace_viewed'),

  // Review events
  proposalCreated: (proposalId: number) => trackEvent('proposal_created', { proposalId }),
  proposalEvaluated: (proposalId: number) => trackEvent('proposal_evaluated', { proposalId }),
  decisionAttested: (proposalId: number) => trackEvent('decision_attested', { proposalId }),

  // Transaction events
  transactionSubmitted: (type: string, hash: string) =>
    trackEvent('transaction_submitted', { type, hash }),
  transactionConfirmed: (type: string, hash: string) =>
    trackEvent('transaction_confirmed', { type, hash }),
  transactionFailed: (type: string, error: string) =>
    trackEvent('transaction_failed', { type, error }),

  // Error events
  error: (type: string, message: string) => trackEvent('error', { type, message }),
} as const;
