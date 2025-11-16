import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdvancedCharts({ trades }) {
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
    let peak = 0;
    let cumulative = 0;
    return trades.map((trade, idx) => {
      cumulative += trade.pnl || 0;
      if (cumulative > peak) peak = cumulative;
      const drawdown = ((peak - cumulative) / peak) * 100;
      return {
        trade: idx + 1,
        equity: cumulative,
        drawdown: -drawdown,
        date: new Date(trade.entry_date).toLocaleDateString()
      };
    });
  }, [trades]);

  const correlationData = useMemo(() => {
    const symbols = [...new Set(trades.map(t => t.symbol))].slice(0, 10);
    return symbols.map(symbol => {
      const symbolTrades = trades.filter(t => t.symbol === symbol);
      const wins = symbolTrades.filter(t => t.pnl > 0).length;
      const total = symbolTrades.length;
      return {
        symbol,
        winRate: total > 0 ? (wins / total) * 100 : 0,
        trades: total,
        totalPnl: symbolTrades.reduce((sum, t) => sum + t.pnl, 0)
      };
    });
  }, [trades]);

  const emotionCorrelation = useMemo(() => {
    const emotions = ['Confident', 'Anxious', 'Calm', 'Excited', 'Fearful', 'Impatient'];
    return emotions.map(emotion => {
      const emotionTrades = trades.filter(t => t.emotion_before === emotion);
      const avgPnl = emotionTrades.length > 0 
        ? emotionTrades.reduce((sum, t) => sum + t.pnl, 0) / emotionTrades.length 
        : 0;
      return {
        emotion,
        avgPnl,
        count: emotionTrades.length
      };
    }).filter(e => e.count > 0);
  }, [trades]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* P&L Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>P&L Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="range" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Drawdown Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Drawdown Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={drawdownData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="trade" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Area type="monotone" dataKey="drawdown" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Symbol Correlation */}
      <Card>
        <CardHeader>
          <CardTitle>Symbol Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="trades" name="Trades" stroke="#64748b" />
              <YAxis dataKey="winRate" name="Win Rate %" stroke="#64748b" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Symbols" data={correlationData} fill="#8b5cf6">
                {correlationData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Emotion Impact */}
      <Card>
        <CardHeader>
          <CardTitle>Emotional Impact on Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={emotionCorrelation}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="emotion" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Bar dataKey="avgPnl" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}