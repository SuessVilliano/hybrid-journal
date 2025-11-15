import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

export default function RecentTrades({ trades }) {
  if (!trades || trades.length === 0) {
    return <p className="text-slate-400 text-sm">No trades yet</p>;
  }

  return (
    <div className="space-y-3">
      {trades.map((trade) => (
        <div key={trade.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition">
          <div className="flex items-center gap-3">
            {trade.pnl >= 0 ? (
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
            )}
            <div>
              <div className="font-medium text-slate-900">{trade.symbol}</div>
              <div className="text-xs text-slate-500">
                {format(new Date(trade.entry_date), 'MMM dd, HH:mm')}
              </div>
            </div>
          </div>
          <div className={`font-bold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trade.pnl >= 0 ? '+' : ''}{trade.pnl?.toFixed(2)}
          </div>
        </div>
      ))}
    </div>
  );
}