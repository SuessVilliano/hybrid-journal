import React from 'react';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function BacktestHistory({ backtests, onSelect }) {
  return (
    <div className="space-y-3">
      {backtests.map((bt) => (
        <div
          key={bt.id}
          onClick={() => onSelect(bt)}
          className="p-4 bg-slate-50 hover:bg-slate-100 rounded-lg cursor-pointer transition-all border border-slate-200 hover:border-blue-300"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {bt.total_return >= 0 ? (
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                </div>
              )}
              <div>
                <div className="font-bold text-slate-900">{bt.name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(bt.created_date), 'MMM dd, yyyy HH:mm')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-bold ${bt.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {bt.total_return >= 0 ? '+' : ''}{bt.total_return?.toFixed(2)}%
              </div>
              <div className="text-xs text-slate-500">{bt.total_trades} trades</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline" className="text-xs">{bt.symbol || 'All'}</Badge>
            {bt.strategy_name && <Badge variant="outline" className="text-xs">{bt.strategy_name}</Badge>}
            <Badge className={`text-xs ${bt.win_rate >= 50 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
              {bt.win_rate?.toFixed(1)}% WR
            </Badge>
            <Badge className="text-xs bg-purple-100 text-purple-700">
              PF: {bt.profit_factor?.toFixed(2)}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}