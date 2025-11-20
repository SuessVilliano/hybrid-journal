import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Calculator, TrendingUp } from 'lucide-react';

export default function CompoundCalculatorWidget({ trades }) {
  const darkMode = document.documentElement.classList.contains('dark');

  // Auto-fill from actual trading stats
  const stats = useMemo(() => {
    if (!trades || trades.length === 0) return null;
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    return {
      winRate: winningTrades.length / trades.length * 100,
      avgWin: winningTrades.reduce((sum, t) => sum + t.pnl, 0) / (winningTrades.length || 1),
      avgLoss: Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / (losingTrades.length || 1))
    };
  }, [trades]);

  const [inputs, setInputs] = useState({
    startingCapital: 10000,
    winRate: stats?.winRate || 60,
    avgWinPercent: 2,
    avgLossPercent: 1,
    tradesPerDay: 2,
    days: 90
  });

  const chartData = useMemo(() => {
    const data = [];
    let balance = inputs.startingCapital;
    const totalTrades = inputs.tradesPerDay * inputs.days;

    for (let i = 0; i <= totalTrades; i++) {
      if (i % inputs.tradesPerDay === 0) {
        data.push({
          trade: i,
          balance: balance,
          day: Math.floor(i / inputs.tradesPerDay)
        });
      }

      // Simulate trade outcome
      const isWin = Math.random() * 100 < inputs.winRate;
      if (isWin) {
        balance += balance * (inputs.avgWinPercent / 100);
      } else {
        balance -= balance * (inputs.avgLossPercent / 100);
      }
    }

    return data;
  }, [inputs]);

  const finalBalance = chartData[chartData.length - 1]?.balance || 0;
  const totalReturn = ((finalBalance - inputs.startingCapital) / inputs.startingCapital * 100);

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Calculator className="h-5 w-5" />
          Compound Growth Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Starting Capital ($)
            </label>
            <Input
              type="number"
              value={inputs.startingCapital}
              onChange={(e) => setInputs({...inputs, startingCapital: Number(e.target.value)})}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Win Rate (%)
            </label>
            <Input
              type="number"
              value={inputs.winRate}
              onChange={(e) => setInputs({...inputs, winRate: Number(e.target.value)})}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Avg Win (%)
            </label>
            <Input
              type="number"
              step="0.1"
              value={inputs.avgWinPercent}
              onChange={(e) => setInputs({...inputs, avgWinPercent: Number(e.target.value)})}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Avg Loss (%)
            </label>
            <Input
              type="number"
              step="0.1"
              value={inputs.avgLossPercent}
              onChange={(e) => setInputs({...inputs, avgLossPercent: Number(e.target.value)})}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Trades/Day
            </label>
            <Input
              type="number"
              value={inputs.tradesPerDay}
              onChange={(e) => setInputs({...inputs, tradesPerDay: Number(e.target.value)})}
              className="mt-1"
            />
          </div>
          
          <div>
            <label className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Days
            </label>
            <Input
              type="number"
              value={inputs.days}
              onChange={(e) => setInputs({...inputs, days: Number(e.target.value)})}
              className="mt-1"
            />
          </div>
        </div>

        {stats && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setInputs({
              ...inputs,
              winRate: stats.winRate,
              avgWinPercent: (stats.avgWin / inputs.startingCapital * 100).toFixed(2),
              avgLossPercent: (stats.avgLoss / inputs.startingCapital * 100).toFixed(2)
            })}
            className={darkMode ? 'border-cyan-500/30 text-cyan-400' : 'border-cyan-500/30 text-cyan-700'}
          >
            Use My Stats
          </Button>
        )}

        {/* Results */}
        <div className={`grid grid-cols-2 gap-4 p-4 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
          <div>
            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Projected Balance</div>
            <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              ${finalBalance.toFixed(2)}
            </div>
          </div>
          <div>
            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Return</div>
            <div className={`text-2xl font-bold ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
            <XAxis 
              dataKey="day" 
              stroke={darkMode ? '#94a3b8' : '#64748b'} 
              style={{ fontSize: '12px' }}
              label={{ value: 'Days', position: 'insideBottom', offset: -5 }}
            />
            <YAxis 
              stroke={darkMode ? '#94a3b8' : '#64748b'} 
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${(value/1000).toFixed(1)}k`}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: darkMode ? '#0f172a' : '#fff',
                border: `1px solid ${darkMode ? '#334155' : '#e2e8f0'}`,
                borderRadius: '8px',
                color: darkMode ? '#fff' : '#000'
              }}
              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Balance']}
              labelFormatter={(label) => `Day ${label}`}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#balanceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>

        <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>
          * Simulation based on compounding returns. Actual results may vary significantly.
        </p>
      </CardContent>
    </Card>
  );
}