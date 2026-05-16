'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const LoadingFallback = () => (
  <div className="h-full flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

export const BarChart = dynamic(
  () => import('recharts').then(mod => mod.BarChart),
  { ssr: false, loading: () => <LoadingFallback /> }
);

export const Bar = dynamic(
  () => import('recharts').then(mod => mod.Bar),
  { ssr: false, loading: () => <LoadingFallback /> }
);

export const LineChart = dynamic(
  () => import('recharts').then(mod => mod.LineChart),
  { ssr: false, loading: () => <LoadingFallback /> }
);

export const Line = dynamic(
  () => import('recharts').then(mod => mod.Line),
  { ssr: false, loading: () => <LoadingFallback /> }
);

export const PieChart = dynamic(
  () => import('recharts').then(mod => mod.PieChart),
  { ssr: false, loading: () => <LoadingFallback /> }
);

export const Pie = dynamic(
  () => import('recharts').then(mod => mod.Pie),
  { ssr: false, loading: () => <LoadingFallback /> }
);

export { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export function ChartSkeleton() {
  return <LoadingFallback />;
}
