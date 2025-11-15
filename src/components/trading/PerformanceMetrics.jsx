import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function PerformanceMetrics({ trades, detailed = false }) {
  const metrics = useMemo(() => {
    if (!trades || trades.length === 0) return null;

    // By Platform
    const byPlatform = trades.reduce((acc, t) => {
      const platform = t.platform || 'Unknown';
      if (!acc[platform]) acc[platform] = { wins: 0, losses: 0, pnl: 0 };
      if (t.pnl > 0) acc[platform].wins++;
      else if (t.pnl < 0) acc[platform].losses++;
      acc[platform].pnl += t.pnl || 0;
      return acc;
    }, {});

    // By Instrument
    const byInstrument = trades.reduce((acc, t) => {
      const inst = t.instrument_type || 'Unknown';
      if (!acc[inst]) acc[inst] = { wins: 0, losses: 0, pnl: 0 };
      if (t.pnl > 0) acc[inst].wins++;
      else if (t.pnl < 0) acc[inst].losses++;
      acc[inst].pnl += t.pnl || 0;
      return acc;
    }, {});

    // By Side
    const bySide = trades.reduce((acc, t) => {
      const side = t.side || 'Unknown';
      if (!acc[side]) acc[side] = { wins: 0, losses: 0, pnl: 0 };
      if (t.pnl > 0) acc[side].wins++;
      else if (t.pnl < 0) acc[side].losses++;
      acc[side].pnl += t.pnl || 0;
      return acc;
    }, {});

    // Best & Worst Symbols
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
        name,
        ...data,
        winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses) * 100) : 0
      })),
      byInstrument: Object.entries(byInstrument).map(([name, data]) => ({
        name,
        ...data,
        winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses) * 100) : 0
      })),
      bySide: Object.entries(bySide).map(([name, data]) => ({
        name,
        ...data,
        winRate: data.wins + data.losses > 0 ? (data.wins / (data.wins + data.losses) * 100) : 0
      })),
      bestSymbols: symbolPerf.slice(0, 5),
      worstSymbols: symbolPerf.slice(-5).reverse()
    };
  }, [trades]);

  if (!metrics) {
    return <p className="text-slate-400">No data available</p>;
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Performance by Platform */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.byPlatform}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="pnl" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Performance by Instrument */}
      <Card>
        <CardHeader>
          <CardTitle>Performance by Instrument</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={metrics.byInstrument}
                dataKey="pnl"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={(entry) => `${entry.name}: $${entry.pnl.toFixed(0)}`}
              >
                {metrics.byInstrument.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Long vs Short */}
      <Card>
        <CardHeader>
          <CardTitle>Long vs Short Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.bySide.map((side) => (
              <div key={side.name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-slate-900">{side.name}</span>
                  <span className={`font-bold ${side.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${side.pnl.toFixed(2)}
                  </span>
                </div>
                <div className="flex gap-4 text-sm text-slate-600">
                  <span>{side.wins}W / {side.losses}L</span>
                  <span>Win Rate: {side.winRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${side.winRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Best Symbols */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Symbols</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.bestSymbols.map((sym, idx) => (
              <div key={sym.symbol} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{sym.symbol}</div>
                    <div className="text-xs text-slate-500">{sym.trades} trades</div>
                  </div>
                </div>
                <div className="font-bold text-green-600">
                  +${sym.pnl.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}