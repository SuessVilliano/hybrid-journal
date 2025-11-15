import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';

export default function EquityCurve({ trades }) {
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
      <div className="h-64 flex items-center justify-center text-slate-400">
        No trade data available
      </div>
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