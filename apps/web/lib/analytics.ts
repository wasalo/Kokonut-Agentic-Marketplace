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
