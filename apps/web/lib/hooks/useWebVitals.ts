'use client';

import { useEffect } from 'react';
import { onCLS, onFCP, onFID, onLCP, onTTI, type Metric } from 'web-vitals';

interface WebVitalsOptions {
  onReport?: (metric: Metric) => void;
  debug?: boolean;
}

function formatMetricValue(value: number): string {
  return `${(value / 1000).toFixed(2)}s`;
}

function logMetric(metric: Metric, debug: boolean = false): void {
  const prefix = '[WebVitals]';
  const formatted = `${metric.name}: ${formatMetricValue(metric.value)}`;

  if (debug) {
    console.log(`${prefix} ${formatted}`, {
      id: metric.id,
      value: metric.value,
      delta: metric.delta,
    });
  }
}

export function reportWebVitals(options: WebVitalsOptions = {}): void {
  const { onReport, debug = process.env.NODE_ENV === 'development' } = options;

  onCLS(metric => {
    logMetric(metric, debug);
    onReport?.(metric);
  });
  onFCP(metric => {
    logMetric(metric, debug);
    onReport?.(metric);
  });
  onFID(metric => {
    logMetric(metric, debug);
    onReport?.(metric);
  });
  onLCP(metric => {
    logMetric(metric, debug);
    onReport?.(metric);
  });
  onTTI(metric => {
    logMetric(metric, debug);
    onReport?.(metric);
  });
}

export function useWebVitals(options: WebVitalsOptions = {}): void {
  useEffect(() => {
    reportWebVitals(options);
  }, []);
}

export default useWebVitals;