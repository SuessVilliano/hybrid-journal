import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, AreaChart, Area, ScatterChart, Scatter, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useChartDarkMode, chartCard, chartTitle, axisProps, gridProps, GlassTooltip, GlowFilter } from '@/components/charts/chartTheme';

export default function AdvancedCharts({ trades }) {
  const darkMode = useChartDarkMode();

  const distributionData = useMemo(() => {
    const ranges = [
      { label: '< -500', min: -Infinity, max: -500 },
      { label: '-500 to -100', min: -500, max: -100 },
      { label: '-100 to 0', min: -100, max: 0 },
      { label: '0 to 100', min: 0, max: 100 },
      { label: '100 to 500', min: 100, max: 500 },
      { label: '> 500', min: 500, max: Infinity }
    ];
    return ranges.map(range => ({
      range: range.label,
      count: trades.filter(t => t.pnl >= range.min && t.pnl < range.max).length
    }));
  }, [trades]);

  const drawdownData = useMemo(() => {
    let peak = 0, cumulative = 0;
    return trades.map((trade, idx) => {
      cumulative += trade.pnl || 0;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
      return { trade: idx + 1, equity: cumulative, drawdown: -drawdown, date: new Date(trade.entry_date).toLocaleDateString() };
    });
  }, [trades]);

  const correlationData = useMemo(() => {
    const symbols = [...new Set(trades.map(t => t.symbol))].slice(0, 10);
    return symbols.map(symbol => {
      const symbolTrades = trades.filter(t => t.symbol === symbol);
      const wins = symbolTrades.filter(t => t.pnl > 0).length;
      const total = symbolTrades.length;
      return { symbol, winRate: total > 0 ? (wins / total) * 100 : 0, trades: total, totalPnl: symbolTrades.reduce((sum, t) => sum + t.pnl, 0) };
    });
  }, [trades]);

  const emotionCorrelation = useMemo(() => {
    const emotions = ['Confident', 'Anxious', 'Calm', 'Excited', 'Fearful', 'Impatient'];
    return emotions.map(emotion => {
      const emotionTrades = trades.filter(t => t.emotion_before === emotion);
      const avgPnl = emotionTrades.length > 0 ? emotionTrades.reduce((sum, t) => sum + t.pnl, 0) / emotionTrades.length : 0;
      return { emotion, avgPnl, count: emotionTrades.length };
    }).filter(e => e.count > 0);
  }, [trades]);

  const card = chartCard(darkMode);
  const title = chartTitle(darkMode);
  const ax = axisProps(darkMode);
  const gr = gridProps(darkMode);
  const money = (p) => `${p.value >= 0 ? '+' : ''}$${Number(p.value).toFixed(2)}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* P&L Distribution */}
      <Card className={card}>
        <CardHeader><CardTitle className={title}>P&L Distribution</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distributionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="acDist" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#0891b2" /></linearGradient>
              </defs>
              <CartesianGrid {...gr} />
              <XAxis dataKey="range" {...ax} />
              <YAxis {...ax} width={36} />
              <Tooltip content={<GlassTooltip dark={darkMode} valueFormatter={(p) => `${p.value} trades`} />} cursor={{ fill: darkMode ? 'rgba(34,211,238,0.05)' : 'rgba(34,211,238,0.08)' }} />
              <Bar dataKey="count" fill="url(#acDist)" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={800} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drawdown Analysis */}
      <Card className={card}>
        <CardHeader><CardTitle className={title}>Drawdown Analysis</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={drawdownData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="acDdFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" stopOpacity={0.5} /><stop offset="100%" stopColor="#f43f5e" stopOpacity={0.05} /></linearGradient>
              </defs>
              <CartesianGrid {...gr} />
              <XAxis dataKey="trade" {...ax} />
              <YAxis {...ax} tickFormatter={(val) => `${val.toFixed(0)}%`} width={44} />
              <Tooltip content={<GlassTooltip dark={darkMode} valueFormatter={(p) => `${Number(p.value).toFixed(1)}%`} />} cursor={{ stroke: '#f43f5e', strokeWidth: 1, strokeDasharray: '4 4', opacity: 0.5 }} />
              <Area type="monotone" dataKey="drawdown" name="Drawdown" stroke="#f43f5e" strokeWidth={2} fill="url(#acDdFill)" dot={false} isAnimationActive animationDuration={900} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Symbol Performance */}
      <Card className={card}>
        <CardHeader><CardTitle className={title}>Symbol Performance</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <defs><GlowFilter id="acScatterGlow" stdDeviation={3} /></defs>
              <CartesianGrid {...gr} />
              <XAxis type="number" dataKey="trades" name="Trades" {...ax} />
              <YAxis type="number" dataKey="winRate" name="Win Rate %" {...ax} tickFormatter={(val) => `${val.toFixed(0)}%`} width={44} />
              <Tooltip cursor={{ strokeDasharray: '3 3', stroke: darkMode ? '#334155' : '#cbd5e1' }} content={<GlassTooltip dark={darkMode} valueFormatter={(p) => p.dataKey === 'winRate' ? `${Number(p.value).toFixed(1)}%` : p.value} titleFormatter={(p) => p[0].payload.symbol} showLabel={false} />} />
              <Scatter name="Symbols" data={correlationData} style={{ filter: 'url(#acScatterGlow)' }} isAnimationActive animationDuration={800}>
                {correlationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.totalPnl >= 0 ? '#22d3ee' : '#f43f5e'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Emotion Impact */}
      <Card className={card}>
        <CardHeader><CardTitle className={title}>Emotional Impact on Performance</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={emotionCorrelation} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="acEmoUp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#7c3aed" /></linearGradient>
                <linearGradient id="acEmoDown" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f43f5e" /><stop offset="100%" stopColor="#fb7185" /></linearGradient>
              </defs>
              <CartesianGrid {...gr} />
              <XAxis dataKey="emotion" {...ax} />
              <YAxis {...ax} tickFormatter={(val) => `$${val.toFixed(0)}`} width={50} />
              <Tooltip content={<GlassTooltip dark={darkMode} valueFormatter={money} />} cursor={{ fill: darkMode ? 'rgba(168,85,247,0.05)' : 'rgba(168,85,247,0.08)' }} />
              <Bar dataKey="avgPnl" name="Avg P&L" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={800}>
                {emotionCorrelation.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.avgPnl >= 0 ? 'url(#acEmoUp)' : 'url(#acEmoDown)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}