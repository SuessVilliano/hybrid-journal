import React, { useMemo, useState, useEffect } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function EquityCurve({ trades }) {
  const [darkMode, setDarkMode] = useState(
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDarkMode(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    const sortedTrades = [...trades].sort((a, b) =>
      new Date(a.entry_date) - new Date(b.entry_date)
    );
    let runningBalance = 0;
    return sortedTrades.map((trade, index) => {
      runningBalance += trade.pnl || 0;
      return {
        date: format(new Date(trade.entry_date), 'MMM dd'),
        balance: runningBalance,
        trade: index + 1
      };
    });
  }, [trades]);

  if (chartData.length === 0) {
    return (
      <div className={`h-64 flex flex-col items-center justify-center gap-2 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
        <TrendingUp className="h-10 w-10 opacity-40" />
        <span className="text-sm">No trade data yet</span>
      </div>
    );
  }

  const isPositive = chartData[chartData.length - 1].balance >= 0;
  const strokeColor = isPositive ? '#22d3ee' : '#f43f5e';
  const glowColor = isPositive ? '#a855f7' : '#fb7185';

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const value = payload[0].value;
    const up = value >= 0;
    return (
      <div className={`px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${
        darkMode ? 'bg-slate-900/90 border-cyan-500/30' : 'bg-white/90 border-cyan-500/20'
      }`}>
        <div className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
        <div className="flex items-center gap-2">
          {up ? <TrendingUp className="h-4 w-4 text-cyan-400" /> : <TrendingDown className="h-4 w-4 text-rose-400" />}
          <span className={`text-lg font-bold ${up ? 'text-cyan-400' : 'text-rose-400'}`}>
            {up ? '+' : ''}${value.toFixed(2)}
          </span>
        </div>
        <div className={`text-[10px] mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Cumulative P&L</div>
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="equityStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={strokeColor} />
            <stop offset="100%" stopColor={glowColor} />
          </linearGradient>
          <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.45} />
            <stop offset="50%" stopColor={glowColor} stopOpacity={0.15} />
            <stop offset="100%" stopColor={glowColor} stopOpacity={0} />
          </linearGradient>
          <filter id="equityGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid
          strokeDasharray="3 6"
          stroke={darkMode ? '#1e293b' : '#e2e8f0'}
          vertical={false}
        />
        <XAxis
          dataKey="date"
          stroke={darkMode ? '#64748b' : '#94a3b8'}
          style={{ fontSize: '11px' }}
          tickLine={false}
          axisLine={false}
          dy={8}
        />
        <YAxis
          stroke={darkMode ? '#64748b' : '#94a3b8'}
          style={{ fontSize: '11px' }}
          tickFormatter={(value) => `$${value.toFixed(0)}`}
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: strokeColor, strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }} />
        <Area
          type="monotone"
          dataKey="balance"
          stroke="url(#equityStroke)"
          strokeWidth={3}
          fill="url(#equityFill)"
          dot={false}
          activeDot={{ r: 5, fill: strokeColor, stroke: darkMode ? '#0f172a' : '#fff', strokeWidth: 2 }}
          isAnimationActive
          animationDuration={900}
          animationEasing="ease-out"
          style={{ filter: 'url(#equityGlow)' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}