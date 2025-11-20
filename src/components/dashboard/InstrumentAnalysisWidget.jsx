import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function InstrumentAnalysisWidget({ trades }) {
  const darkMode = document.documentElement.classList.contains('dark');

  const symbolData = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    
    const symbols = trades.reduce((acc, t) => {
      if (!acc[t.symbol]) acc[t.symbol] = { wins: 0, losses: 0, pnl: 0 };
      if (t.pnl > 0) acc[t.symbol].wins++;
      else if (t.pnl < 0) acc[t.symbol].losses++;
      acc[t.symbol].pnl += t.pnl || 0;
      return acc;
    }, {});

    return Object.entries(symbols)
      .map(([symbol, data]) => ({
        symbol,
        winRate: ((data.wins / (data.wins + data.losses)) * 100).toFixed(1),
        pnl: data.pnl,
        trades: data.wins + data.losses
      }))
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 8);
  }, [trades]);

  if (symbolData.length === 0) {
    return (
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            <TrendingUp className="h-5 w-5" />
            Top Instruments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            No instrument data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <TrendingUp className="h-5 w-5" />
          Top Instruments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {symbolData.map((item, idx) => (
            <div
              key={item.symbol}
              className={`flex items-center justify-between p-3 rounded-lg ${
                darkMode ? 'bg-slate-900/50' : 'bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  item.pnl >= 0 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  {idx + 1}
                </div>
                <div>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {item.symbol}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {item.winRate}% • {item.trades} trades
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {item.pnl >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`font-bold ${item.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${Math.abs(item.pnl).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}