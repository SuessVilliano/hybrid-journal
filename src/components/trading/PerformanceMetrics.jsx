import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PerformanceMetrics({ trades, detailed = false }) {
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

  const metrics = useMemo(() => {
    if (!trades || trades.length === 0) return null;

    const byPlatform = trades.reduce((acc, t) => {
      const platform = t.platform || 'Unknown';
      if (!acc[platform]) acc[platform] = { wins: 0, losses: 0, pnl: 0 };
      if (t.pnl > 0) acc[platform].wins++;
      else if (t.pnl < 0) acc[platform].losses++;
      acc[platform].pnl += t.pnl || 0;
      return acc;
    }, {});

    const byInstrument = trades.reduce((acc, t) => {
      const inst = t.instrument_type || 'Unknown';
      if (!acc[inst]) acc[inst] = { wins: 0, losses: 0, pnl: 0 };
      if (t.pnl > 0) acc[inst].wins++;
      else if (t.pnl < 0) acc[inst].losses++;
      acc[inst].pnl += t.pnl || 0;
      return acc;
    }, {});

    const bySide = trades.reduce((acc, t) => {
      const side = t.side || 'Unknown';
      if (!acc[side]) acc[side] = { wins: 0, losses: 0, pnl: 0 };
      if (t.pnl > 0) acc[side].wins++;
      else if (t.pnl < 0) acc[side].losses++;
      acc[side].pnl += t.pnl || 0;
      return acc;
    }, {});

    const bySymbol = trades.reduce((acc, t) => {
      if (!acc[t.symbol]) acc[t.symbol] = { trades: 0, pnl: 0 };
      acc[t.symbol].trades++;
      acc[t.symbol].pnl += t.pnl || 0;
      return acc;
    }, {});

    const symbolPerf = Object.entries(bySymbol)
      .map(([symbol, data]) => ({ symbol, ...data }))
      .sort((a, b) => b.pnl - a.pnl);

    return {
      byPlatform: Object.entries(byPlatform).map(([name, data]) => ({
        name, ...data,
        winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses) * 100) : 0
      })),
      byInstrument: Object.entries(byInstrument).map(([name, data]) => ({
        name, ...data,
        winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses) * 100) : 0
      })),
      bySide: Object.entries(bySide).map(([name, data]) => ({
        name, ...data,
        winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses) * 100) : 0
      })),
      bestSymbols: symbolPerf.slice(0, 5),
      worstSymbols: symbolPerf.slice(-5).reverse()
    };
  }, [trades]);

  if (!metrics) {
    return <p className={darkMode ? 'text-slate-500' : 'text-slate-400'}>No data available</p>;
  }

  const GRADIENTS = ['#22d3ee', '#a855f7', '#ec4899', '#f59e0b', '#10b981'];
  const cardCls = darkMode
    ? 'bg-slate-950/80 backdrop-blur-xl border-cyan-500/20'
    : 'bg-white/80 backdrop-blur-xl border-cyan-500/30';
  const titleCls = darkMode ? 'text-cyan-400' : 'text-cyan-700';

  const BarTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const v = payload[0].value;
    return (
      <div className={`px-3 py-2 rounded-lg border backdrop-blur-xl shadow-xl text-xs ${darkMode ? 'bg-slate-900/90 border-cyan-500/30 text-white' : 'bg-white/90 border-cyan-500/20 text-slate-900'}`}>
        <div className="font-semibold mb-0.5">{label}</div>
        <div className={v >= 0 ? 'text-cyan-400' : 'text-rose-400'}>{v >= 0 ? '+' : ''}${v.toFixed(2)}</div>
      </div>
    );
  };

  const PieTooltip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className={`px-3 py-2 rounded-lg border backdrop-blur-xl shadow-xl text-xs ${darkMode ? 'bg-slate-900/90 border-cyan-500/30 text-white' : 'bg-white/90 border-cyan-500/20 text-slate-900'}`}>
        <div className="font-semibold mb-0.5">{d.name}</div>
        <div className={d.pnl >= 0 ? 'text-cyan-400' : 'text-rose-400'}>{d.pnl >= 0 ? '+' : ''}${d.pnl.toFixed(2)}</div>
        <div className={darkMode ? 'text-slate-400' : 'text-slate-500'}>{d.wins}W / {d.losses}L</div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Performance by Platform */}
      <Card className={cardCls}>
        <CardHeader>
          <CardTitle className={titleCls}>Performance by Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.byPlatform} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barPlatform" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke={darkMode ? '#1e293b' : '#e2e8f0'} vertical={false} />
              <XAxis dataKey="name" stroke={darkMode ? '#64748b' : '#94a3b8'} style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
              <YAxis stroke={darkMode ? '#64748b' : '#94a3b8'} style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: darkMode ? 'rgba(34,211,238,0.05)' : 'rgba(34,211,238,0.08)' }} />
              <Bar dataKey="pnl" fill="url(#barPlatform)" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance by Instrument */}
      <Card className={cardCls}>
        <CardHeader>
          <CardTitle className={titleCls}>Performance by Instrument</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <defs>
                {GRADIENTS.map((c, i) => (
                  <linearGradient key={i} id={`pieSlice${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={c} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={metrics.byInstrument}
                dataKey="pnl"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                isAnimationActive
                animationDuration={800}
                stroke={darkMode ? '#0f172a' : '#fff'}
                strokeWidth={2}
              >
                {metrics.byInstrument.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`url(#pieSlice${index % GRADIENTS.length})`} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Long vs Short */}
      <Card className={cardCls}>
        <CardHeader>
          <CardTitle className={titleCls}>Long vs Short Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {metrics.bySide.map((side) => (
              <div key={side.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{side.name}</span>
                  <span className={`font-bold ${side.pnl >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                    {side.pnl >= 0 ? '+' : ''}${side.pnl.toFixed(2)}
                  </span>
                </div>
                <div className={`flex gap-4 text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  <span>{side.wins}W / {side.losses}L</span>
                  <span>Win Rate: {side.winRate.toFixed(1)}%</span>
                </div>
                <div className={`w-full rounded-full h-2.5 overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-700"
                    style={{ width: `${side.winRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best Symbols */}
      <Card className={cardCls}>
        <CardHeader>
          <CardTitle className={titleCls}>Top Performing Symbols</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.bestSymbols.map((sym, idx) => (
              <div key={sym.symbol} className={`flex items-center justify-between p-3 rounded-xl transition-all hover:scale-[1.02] ${darkMode ? 'bg-slate-900/60 border border-cyan-500/10' : 'bg-slate-50 border border-slate-100'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
                    {idx + 1}
                  </div>
                  <div>
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{sym.symbol}</div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{sym.trades} trades</div>
                  </div>
                </div>
                <div className={`font-bold ${sym.pnl >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {sym.pnl >= 0 ? '+' : ''}${sym.pnl.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}