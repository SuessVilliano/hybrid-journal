import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, Legend } from 'recharts';
import { format } from 'date-fns';
import { getProvider, getSymbolClass } from '@/lib/providers';

const BUCKET_PALETTE = ['#6366f1', '#0ea5e9', '#f97316', '#10b981', '#a855f7', '#22c55e', '#f43f5e', '#0891b2'];

// Build per-(provider, symbol_class) running totals so futures (point-value
// math) and equities (share math) don't get mixed in the same $/point line.
// The total balance line still sums the buckets together.
export default function EquityCurve({ trades, splitByProvider = false }) {
  const { chartData, bucketKeys } = useMemo(() => {
    if (!trades || trades.length === 0) return { chartData: [], bucketKeys: [] };

    const bucketKeyOf = (t) => {
      const providerLabel = getProvider(t)?.label || t.platform || 'Manual';
      const symbolClass = getSymbolClass(t);
      return `${providerLabel} · ${symbolClass}`;
    };

    const sorted = [...trades].sort(
      (a, b) => new Date(a.entry_date) - new Date(b.entry_date)
    );

    const runningByBucket = {};
    const allBuckets = new Set();
    let total = 0;

    const points = sorted.map((trade, index) => {
      const key = bucketKeyOf(trade);
      allBuckets.add(key);
      runningByBucket[key] = (runningByBucket[key] || 0) + (trade.pnl || 0);
      total += trade.pnl || 0;

      const point = {
        date: format(new Date(trade.entry_date), 'MMM dd'),
        balance: total,
        trade: index + 1
      };
      for (const k of allBuckets) {
        point[k] = runningByBucket[k] || 0;
      }
      return point;
    });

    return { chartData: points, bucketKeys: Array.from(allBuckets) };
  }, [trades]);

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        No trade data available
      </div>
    );
  }

  if (splitByProvider && bucketKeys.length > 1) {
    return (
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, '']}
          />
          <Legend />
          {bucketKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={BUCKET_PALETTE[i % BUCKET_PALETTE.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="date"
          stroke="#64748b"
          style={{ fontSize: '12px' }}
        />
        <YAxis
          stroke="#64748b"
          style={{ fontSize: '12px' }}
          tickFormatter={(value) => `$${value.toFixed(0)}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          formatter={(value) => [`$${value.toFixed(2)}`, 'Balance']}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#colorBalance)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
