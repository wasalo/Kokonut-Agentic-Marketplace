'use client';

import { lazy, Suspense, type ComponentType, type ReactElement } from 'react';
import { Loader2 } from 'lucide-react';

const ChartSkeleton = () => (
  <div className="h-full flex items-center justify-center">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

type LazyComponentProps = Record<string, any>;
type AnyComponent = ComponentType<any>;

const makeChartComponent = (
  loader: () => Promise<{ default: AnyComponent }>
): ((props: LazyComponentProps) => ReactElement) => {
  const Component = lazy(loader);
  return (props: LazyComponentProps) => (
    <Suspense fallback={<ChartSkeleton />}>
      <Component {...props} />
    </Suspense>
  );
};

const asAny = <T,>(val: T): AnyComponent => val as unknown as AnyComponent;

export const BarChart = makeChartComponent(() =>
  import('recharts').then(m => ({ default: asAny(m.BarChart) }))
);
export const Bar = makeChartComponent(() =>
  import('recharts').then(m => ({ default: asAny(m.Bar) }))
);
export const XAxis = makeChartComponent(() =>
  import('recharts').then(m => ({ default: asAny(m.XAxis) }))
);
export const YAxis = makeChartComponent(() =>
  import('recharts').then(m => ({ default: asAny(m.YAxis) }))
);
export const CartesianGrid = makeChartComponent(() =>
  import('recharts').then(m => ({ default: asAny(m.CartesianGrid) }))
);
export const Tooltip = makeChartComponent(() =>
  import('recharts').then(m => ({ default: asAny(m.Tooltip) }))
);
export const ResponsiveContainer = makeChartComponent(() =>
  import('recharts').then(m => ({ default: asAny(m.ResponsiveContainer) }))
);
export const LineChart = makeChartComponent(() =>
  import('recharts').then(m => ({ default: asAny(m.LineChart) }))
);
export const Line = makeChartComponent(() =>
  import('recharts').then(m => ({ default: asAny(m.Line) }))
);
export const PieChart = makeChartComponent(() =>
  import('recharts').then(m => ({ default: asAny(m.PieChart) }))
);
export const Pie = makeChartComponent(() =>
  import('recharts').then(m => ({ default: asAny(m.Pie) }))
);
export const Cell = makeChartComponent(() =>
  import('recharts').then(m => ({ default: asAny(m.Cell) }))
);

export { ChartSkeleton };
