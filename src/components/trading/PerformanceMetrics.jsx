import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { groupTradeStats } from '@/lib/tradingAnalytics';

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

    const byPlatform = groupTradeStats(trades, (t) => t.platform || 'Unknown');
    const byInstrument = groupTradeStats(trades, (t) => t.instrument_type || 'Unknown');
    const bySide = groupTradeStats(trades, (t) => t.side || 'Unknown');
    const bySymbol = groupTradeStats(trades, (t) => t.symbol || 'Unknown')
      .sort((a, b) => b.totalPnl - a.totalPnl);

    return {
      byPlatform,
      byInstrument,
      bySide,
      bestSymbols: bySymbol.slice(0, 5),
      worstSymbols: [...bySymbol].reverse().slice(0, 5),
    };
  }, [trades]);

  if (!metrics) {
    return <p className={darkMode ? 'text-slate-500' : 'text-slate-400'}>No realized trade data available</p>;
  }

  const cardCls = darkMode
    ? 'bg-slate-950/80 backdrop-blur-xl border-cyan-500/20'
    : 'bg-white/80 backdrop-blur-xl border-cyan-500/30';
  const titleCls = darkMode ? 'text-cyan-400' : 'text-cyan-700';

  const BarTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
      <div className={`px-3 py-2 rounded-lg border backdrop-blur-xl shadow-xl text-xs ${darkMode ? 'bg-slate-900/90 border-cyan-500/30 text-white' : 'bg-white/90 border-cyan-500/20 text-slate-900'}`}>
        <div className="font-semibold mb-1">{label}</div>
        <div className={d.totalPnl >= 0 ? 'text-cyan-400' : 'text-rose-400'}>
          {d.totalPnl >= 0 ? '+' : ''}${d.totalPnl.toFixed(2)}
        </div>
        <div className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
          {d.winningTrades}W / {d.losingTrades}L / {d.breakevenTrades}BE · {d.winRate.toFixed(1)}%
        </div>
      </div>
    );
  };

  const BreakdownCard = ({ title, data }) => (
    <Card className={cardCls}>
      <CardHeader>
        <CardTitle className={titleCls}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item) => (
            <div key={item.name} className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/50 border-cyan-500/10' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex justify-between items-center gap-4">
                <div>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{item.name}</div>
                  <div className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {item.totalTrades} trades · {item.winningTrades}W / {item.losingTrades}L / {item.breakevenTrades}BE
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${item.totalPnl >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                    {item.totalPnl >= 0 ? '+' : ''}${item.totalPnl.toFixed(2)}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    WR {item.winRate.toFixed(1)}% · PF {item.profitFactor === Infinity ? '∞' : item.profitFactor.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className={cardCls}>
        <CardHeader>
          <CardTitle className={titleCls}>Performance by Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics.byPlatform} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke={darkMode ? '#1e293b' : '#e2e8f0'} vertical={false} />
              <XAxis dataKey="name" stroke={darkMode ? '#64748b' : '#94a3b8'} style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
              <YAxis stroke={darkMode ? '#64748b' : '#94a3b8'} style={{ fontSize: '11px' }} tickLine={false} axisLine={false} />
              <Tooltip content={<BarTooltip />} cursor={{ fill: darkMode ? 'rgba(34,211,238,0.05)' : 'rgba(34,211,238,0.08)' }} />
              <Bar dataKey="totalPnl" fill="currentColor" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <BreakdownCard title="Performance by Instrument" data={metrics.byInstrument} />
      <BreakdownCard title="Long vs Short Performance" data={metrics.bySide} />

      <Card className={cardCls}>
        <CardHeader>
          <CardTitle className={titleCls}>Top Performing Symbols</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.bestSymbols.map((sym, idx) => (
              <div key={sym.name} className={`flex items-center justify-between p-3 rounded-xl ${darkMode ? 'bg-slate-900/60 border border-cyan-500/10' : 'bg-slate-50 border border-slate-100'}`}>
                <div>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{idx + 1}. {sym.name}</div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {sym.totalTrades} trades · Expectancy ${sym.expectancy.toFixed(2)} · WR {sym.winRate.toFixed(1)}%
                  </div>
                </div>
                <div className={`font-bold ${sym.totalPnl >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                  {sym.totalPnl >= 0 ? '+' : ''}${sym.totalPnl.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {detailed && (
        <Card className={`${cardCls} lg:col-span-2`}>
          <CardHeader>
            <CardTitle className={titleCls}>Weakest Symbols</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {metrics.worstSymbols.map((sym) => (
              <div key={sym.name} className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/50 border-rose-500/10' : 'bg-slate-50 border-slate-100'}`}>
                <div className="flex justify-between">
                  <span className={darkMode ? 'text-white' : 'text-slate-900'}>{sym.name}</span>
                  <span className={sym.totalPnl >= 0 ? 'text-cyan-400' : 'text-rose-400'}>${sym.totalPnl.toFixed(2)}</span>
                </div>
                <div className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  PF {sym.profitFactor === Infinity ? '∞' : sym.profitFactor.toFixed(2)} · Max DD ${sym.maxDrawdown.toFixed(2)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
