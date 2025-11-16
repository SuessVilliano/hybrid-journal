import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart
} from 'recharts';

// Trade Distribution by Hour
export function TradeDistributionChart({ trades }) {
  const data = useMemo(() => {
    const hours = Array(24).fill(0).map((_, i) => ({ hour: i, wins: 0, losses: 0 }));
    
    trades.forEach(trade => {
      const hour = new Date(trade.entry_date).getHours();
      if (trade.pnl > 0) hours[hour].wins++;
      else if (trade.pnl < 0) hours[hour].losses++;
    });
    
    return hours.map(h => ({
      ...h,
      hour: `${h.hour}:00`,
      winRate: h.wins + h.losses > 0 ? (h.wins / (h.wins + h.losses) * 100) : 0
    }));
  }, [trades]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trade Distribution by Hour</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="wins" stackId="a" fill="#10b981" name="Wins" />
            <Bar dataKey="losses" stackId="a" fill="#ef4444" name="Losses" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Drawdown Analysis
export function DrawdownChart({ trades }) {
  const data = useMemo(() => {
    let peak = 0;
    let equity = 0;
    
    return trades.map(trade => {
      equity += trade.pnl;
      if (equity > peak) peak = equity;
      const drawdown = peak > 0 ? ((peak - equity) / peak * 100) : 0;
      
      return {
        date: new Date(trade.entry_date).toLocaleDateString(),
        equity,
        drawdown: -drawdown
      };
    });
  }, [trades]);

  const maxDrawdown = Math.min(...data.map(d => d.drawdown));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drawdown Analysis</CardTitle>
        <p className="text-sm text-slate-600">
          Max Drawdown: <span className="font-bold text-red-600">{maxDrawdown.toFixed(2)}%</span>
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke="#ef4444"
              fill="#ef4444"
              fillOpacity={0.3}
              name="Drawdown %"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// P&L Distribution
export function PnLDistributionChart({ trades }) {
  const data = useMemo(() => {
    const ranges = [
      { label: '<-500', min: -Infinity, max: -500, count: 0 },
      { label: '-500 to -200', min: -500, max: -200, count: 0 },
      { label: '-200 to -100', min: -200, max: -100, count: 0 },
      { label: '-100 to 0', min: -100, max: 0, count: 0 },
      { label: '0 to 100', min: 0, max: 100, count: 0 },
      { label: '100 to 200', min: 100, max: 200, count: 0 },
      { label: '200 to 500', min: 200, max: 500, count: 0 },
      { label: '>500', min: 500, max: Infinity, count: 0 }
    ];
    
    trades.forEach(trade => {
      const range = ranges.find(r => trade.pnl >= r.min && trade.pnl < r.max);
      if (range) range.count++;
    });
    
    return ranges;
  }, [trades]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>P&L Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" name="Trade Count" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// Symbol Correlation Matrix
export function SymbolCorrelationChart({ trades }) {
  const data = useMemo(() => {
    const symbols = [...new Set(trades.map(t => t.symbol))].slice(0, 10);
    const correlations = [];
    
    symbols.forEach(sym1 => {
      const sym1Trades = trades.filter(t => t.symbol === sym1);
      const sym1WinRate = sym1Trades.filter(t => t.pnl > 0).length / sym1Trades.length;
      
      symbols.forEach(sym2 => {
        const sym2Trades = trades.filter(t => t.symbol === sym2);
        const sym2WinRate = sym2Trades.filter(t => t.pnl > 0).length / sym2Trades.length;
        
        correlations.push({
          x: sym1,
          y: sym2,
          correlation: Math.abs(sym1WinRate - sym2WinRate)
        });
      });
    });
    
    return { symbols, correlations };
  }, [trades]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Symbol Performance Correlation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-10 gap-1">
          {data.correlations.map((corr, idx) => (
            <div
              key={idx}
              className="aspect-square rounded"
              style={{
                backgroundColor: `rgba(59, 130, 246, ${corr.correlation})`,
              }}
              title={`${corr.x} vs ${corr.y}: ${corr.correlation.toFixed(2)}`}
            />
          ))}
        </div>
        <div className="mt-4 flex justify-between text-xs text-slate-600">
          <span>Low Correlation</span>
          <span>High Correlation</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Win/Loss Streaks
export function StreakAnalysisChart({ trades }) {
  const data = useMemo(() => {
    let currentStreak = 0;
    let streakType = null;
    const streaks = [];
    
    trades.forEach((trade, idx) => {
      const isWin = trade.pnl > 0;
      
      if (streakType === null) {
        streakType = isWin ? 'win' : 'loss';
        currentStreak = 1;
      } else if ((isWin && streakType === 'win') || (!isWin && streakType === 'loss')) {
        currentStreak++;
      } else {
        streaks.push({ type: streakType, length: currentStreak, index: idx });
        streakType = isWin ? 'win' : 'loss';
        currentStreak = 1;
      }
    });
    
    if (currentStreak > 0) {
      streaks.push({ type: streakType, length: currentStreak, index: trades.length });
    }
    
    return streaks.map((s, i) => ({
      ...s,
      streak: i + 1,
      value: s.type === 'win' ? s.length : -s.length
    }));
  }, [trades]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Win/Loss Streaks</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="streak" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#3b82f6" name="Streak Length">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.type === 'win' ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}