'use client';

import { useEffect } from 'react';
import { reportWebVitals } from '@/lib/hooks/useWebVitals';
import { initMixpanel, trackPageView, trackEvent } from '@/lib/analytics';

export function WebVitalsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const mixpanelToken = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
    if (mixpanelToken) {
      initMixpanel(mixpanelToken)
        .then(() => {
          trackPageView(window.location.pathname);
        })
        .catch(e => {
          console.warn('Mixpanel init failed:', e);
        });
    }

    reportWebVitals({
      debug: process.env.NODE_ENV === 'development',
      onReport: metric => {
        if (mixpanelToken) {
          trackEvent('web_vital', {
            name: metric.name,
            value: metric.value,
            delta: metric.delta,
            id: metric.id,
          });
        }
      },
    });
  }, []);

  return <>{children}</>;
}
