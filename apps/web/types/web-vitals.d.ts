declare module 'web-vitals' {
  export interface Metric {
    name: 'CLS' | 'FCP' | 'FID' | 'LCP' | 'INP' | 'TTFB';
    value: number;
    delta: number;
    id: string;
  }

  export type MetricReportCallback = (metric: Metric) => void;

  export function onCLS(
    onReport: MetricReportCallback,
    opts?: { reportAllChanges?: boolean }
  ): void;
  export function onFCP(
    onReport: MetricReportCallback,
    opts?: { reportAllChanges?: boolean }
  ): void;
  export function onFID(
    onReport: MetricReportCallback,
    opts?: { reportAllChanges?: boolean }
  ): void;
  export function onINP(
    onReport: MetricReportCallback,
    opts?: { reportAllChanges?: boolean }
  ): void;
  export function onLCP(
    onReport: MetricReportCallback,
    opts?: { reportAllChanges?: boolean }
  ): void;
  export function onTTFB(
    onReport: MetricReportCallback,
    opts?: { reportAllChanges?: boolean }
  ): void;
}
