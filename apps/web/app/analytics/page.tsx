'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useMemo, Suspense } from 'react';
import {
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
} from '@/components/ChartComponents';
import {
  TrendingUp,
  Briefcase,
  ShoppingBag,
  Scale,
  Loader2,
  RefreshCw,
  DollarSign,
} from 'lucide-react';
import { useAnalytics, TIME_RANGES, type TimeRange } from '@/lib/hooks/useAnalytics';
import { StatCard } from '@/components/ui/stat-card';
import { Card } from '@heroui/react';

const COLORS = ['#009F4D', '#00c853', '#FFCD00', '#FFB800', '#FF6B6B'];

const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '7D', label: '7D' },
  { value: '30D', label: '30D' },
  { value: '3M', label: '3M' },
];

function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  return (
    <div className="flex items-center gap-1 p-1 bg-content2 rounded-lg">
      {TIME_RANGE_OPTIONS.map(option => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
            value === option.value
              ? 'bg-primary text-white shadow-sm'
              : 'text-default-500 hover:text-foreground hover:bg-content3'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function AnalyticsPage(): JSX.Element {
  return (
    <Suspense fallback={<AnalyticsContent timeRange="7D" />}>
      <AnalyticsPageWithParams />
    </Suspense>
  );
}

function AnalyticsPageWithParams(): JSX.Element {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const timeRange = useMemo(() => {
    const param = searchParams.get('range');
    if (param && (param === '7D' || param === '30D' || param === '3M')) {
      return param as TimeRange;
    }
    return '7D' as TimeRange;
  }, [searchParams]);

  const handleTimeRangeChange = useCallback(
    (newRange: TimeRange) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('range', newRange);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return <AnalyticsContent timeRange={timeRange} onTimeRangeChange={handleTimeRangeChange} />;
}

function AnalyticsContent({
  timeRange,
  onTimeRangeChange,
}: {
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
}): JSX.Element {
  const { data, isLoading, error, refetch } = useAnalytics(timeRange);
  const rangeDays = TIME_RANGES[timeRange].days;
  const rangeLabel = timeRange === '7D' ? '7 days' : timeRange === '30D' ? '30 days' : '90 days';

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-default-500">Platform metrics and trends ({rangeLabel})</p>
        </div>
        <div className="flex items-center gap-3">
          {onTimeRangeChange && (
            <TimeRangeSelector value={timeRange} onChange={onTimeRangeChange} />
          )}
          <button
            onClick={() => {
              void refetch();
            }}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-divider rounded-lg hover:bg-content2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-danger-100 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-8 w-8 text-danger" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Error Loading Analytics</h3>
          <p className="text-default-500 max-w-md mx-auto mb-4">{error.message}</p>
          <button
            onClick={() => {
              void refetch();
            }}
            className="px-4 py-2 bg-gradient-to-r from-[#009F4D] to-[#00c853] text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Jobs Created"
              value={data?.totals.totalJobs.toString() || '0'}
              subtext={`Last ${rangeLabel}`}
              icon={Briefcase}
              isLoading={isLoading}
            />
            <StatCard
              label="Services Listed"
              value={data?.totals.totalServices.toString() || '0'}
              subtext="New listings"
              icon={ShoppingBag}
              isLoading={isLoading}
            />
            <StatCard
              label="Proposals"
              value={data?.totals.totalProposals.toString() || '0'}
              subtext="Submitted"
              icon={Scale}
              isLoading={isLoading}
            />
            <StatCard
              label="USDC Volume"
              value={`$${data?.totals.totalVolumeUSDC.toFixed(2) || '0.00'}`}
              subtext="Total escrow volume"
              icon={DollarSign}
              isLoading={isLoading}
            />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Daily Activity Chart */}
            <Card className="border border-divider p-6">
              <h3 className="text-lg font-semibold mb-4">Daily Activity</h3>
              <div className="h-64">
                {isLoading ? (
                  <ChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.dailyStats || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #eee',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="jobs" fill="#009F4D" radius={[4, 4, 0, 0]} name="Jobs" />
                      <Bar
                        dataKey="services"
                        fill="#FFCD00"
                        radius={[4, 4, 0, 0]}
                        name="Services"
                      />
                      <Bar
                        dataKey="proposals"
                        fill="#00c853"
                        radius={[4, 4, 0, 0]}
                        name="Proposals"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Volume Chart */}
            <Card className="border border-divider p-6">
              <h3 className="text-lg font-semibold mb-4">Daily Volume</h3>
              <div className="h-64">
                {isLoading ? (
                  <ChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data?.dailyStats || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #eee',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="volumeUSDC"
                        stroke="#009F4D"
                        strokeWidth={2}
                        dot={{ fill: '#009F4D', r: 4 }}
                        name="USDC Volume"
                      />
                      <Line
                        type="monotone"
                        dataKey="volumeETH"
                        stroke="#FFCD00"
                        strokeWidth={2}
                        dot={{ fill: '#FFCD00', r: 4 }}
                        name="ETH Volume"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Job Status Distribution */}
            <Card className="border border-divider p-6">
              <h3 className="text-lg font-semibold mb-4">Job Status Distribution</h3>
              <div className="h-64">
                {isLoading ? (
                  <ChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Open', value: data?.statusDistribution.open || 0 },
                          { name: 'Funded', value: data?.statusDistribution.funded || 0 },
                          { name: 'Submitted', value: data?.statusDistribution.submitted || 0 },
                          { name: 'Completed', value: data?.statusDistribution.completed || 0 },
                          { name: 'Rejected', value: data?.statusDistribution.rejected || 0 },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-4 flex-wrap">
                {['Open', 'Funded', 'Submitted', 'Completed', 'Rejected'].map((status, index) => (
                  <div key={status} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span className="text-xs text-default-500">{status}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Key Metrics */}
            <Card className="border border-divider p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-content2 rounded-lg">
                  <p className="text-sm text-default-500">Average Job Value</p>
                  <p className="text-xl font-bold text-success mt-1">
                    $
                    {data?.totals.totalJobs
                      ? (data.totals.totalVolumeUSDC / data.totals.totalJobs).toFixed(2)
                      : '0.00'}
                  </p>
                </div>
                <div className="p-4 bg-content2 rounded-lg">
                  <p className="text-sm text-default-500">ETH Staked</p>
                  <p className="text-xl font-bold text-primary mt-1">
                    {data?.totals.totalVolumeETH.toFixed(4) || '0.0000'} ETH
                  </p>
                </div>
                <div className="p-4 bg-content2 rounded-lg">
                  <p className="text-sm text-default-500">Jobs per Day</p>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {data?.totals.totalJobs
                      ? (data.totals.totalJobs / rangeDays).toFixed(1)
                      : '0.0'}
                  </p>
                </div>
                <div className="p-4 bg-content2 rounded-lg">
                  <p className="text-sm text-default-500">Services per Day</p>
                  <p className="text-xl font-bold text-foreground mt-1">
                    {data?.totals.totalServices
                      ? (data.totals.totalServices / rangeDays).toFixed(1)
                      : '0.0'}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Info */}
          <p className="text-center text-xs text-default-400 mt-8">
            Analytics data is fetched from onchain events on Sepolia testnet. Data reflects the last{' '}
            {rangeLabel} of activity.
          </p>
        </>
      )}
    </div>
  );
}
