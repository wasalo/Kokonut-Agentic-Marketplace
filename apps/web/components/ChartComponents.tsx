'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });

const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });

const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });

const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), {
  ssr: false,
});

const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });

const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), {
  ssr: false,
});

const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });

const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
});

const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });

const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

function ChartSkeleton() {
  return (
    <div className="h-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

export {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ChartSkeleton,
};
