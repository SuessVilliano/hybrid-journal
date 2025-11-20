import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Layers } from 'lucide-react';

export default function StrategyPerformanceWidget({ trades }) {
  const darkMode = document.documentElement.classList.contains('dark');

  const strategyData = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    
    const strategies = trades.reduce((acc, t) => {
      if (t.strategy) {
        if (!acc[t.strategy]) acc[t.strategy] = { wins: 0, losses: 0, pnl: 0 };
        if (t.pnl > 0) acc[t.strategy].wins++;
        else if (t.pnl < 0) acc[t.strategy].losses++;
        acc[t.strategy].pnl += t.pnl || 0;
      }
      return acc;
    }, {});

    return Object.entries(strategies)
      .map(([name, data]) => ({
        name,
        winRate: ((data.wins / (data.wins + data.losses)) * 100).toFixed(1),
        pnl: data.pnl,
        trades: data.wins + data.losses
      }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);
  }, [trades]);

  if (strategyData.length === 0) {
    return (
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            <Layers className="h-5 w-5" />
            Strategy Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            No strategy data available. Tag your trades with strategies to see performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Layers className="h-5 w-5" />
          Top Strategies
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={strategyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
            <XAxis dataKey="name" stroke={darkMode ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} />
            <YAxis stroke={darkMode ? '#94a3b8' : '#64748b'} style={{ fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{
                backgroundColor: darkMode ? '#0f172a' : '#fff',
                border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                borderRadius: '8px',
                color: darkMode ? '#fff' : '#000'
              }}
            />
            <Bar dataKey="pnl" fill="#3b82f6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        
        <div className="mt-4 space-y-2">
          {strategyData.map((strategy) => (
            <div key={strategy.name} className={`flex justify-between text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <span className="font-medium">{strategy.name}</span>
              <span className={darkMode ? 'text-cyan-400' : 'text-cyan-600'}>
                {strategy.winRate}% ({strategy.trades} trades)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}