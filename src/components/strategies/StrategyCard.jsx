import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

export default function StrategyCard({ strategy, trades, onEdit, onDelete }) {
  const performance = useMemo(() => {
    const strategyTrades = trades.filter(t => t.strategy === strategy.name);
    
    if (strategyTrades.length === 0) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnl: 0,
        avgWin: 0,
        avgLoss: 0
      };
    }

    const wins = strategyTrades.filter(t => t.pnl > 0);
    const losses = strategyTrades.filter(t => t.pnl < 0);
    const totalPnl = strategyTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;

    return {
      totalTrades: strategyTrades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: (wins.length / strategyTrades.length) * 100,
      totalPnl,
      avgWin,
      avgLoss
    };
  }, [strategy, trades]);

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <CardTitle className="text-lg">{strategy.name}</CardTitle>
            {strategy.active && (
              <Badge className="bg-green-100 text-green-700">Active</Badge>
            )}
          </div>
          {strategy.description && (
            <p className="text-sm text-slate-600 mb-3">{strategy.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onEdit(strategy)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(strategy.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Performance Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-slate-900">{performance.totalTrades}</div>
            <div className="text-xs text-slate-600">Trades</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{performance.winRate.toFixed(1)}%</div>
            <div className="text-xs text-slate-600">Win Rate</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${performance.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {performance.totalPnl >= 0 ? '+' : ''}{performance.totalPnl.toFixed(2)}
            </div>
            <div className="text-xs text-slate-600">Total P&L</div>
          </div>
        </div>

        {/* Win/Loss Breakdown */}
        {performance.totalTrades > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-slate-600">{performance.wins}W (${performance.avgWin.toFixed(2)} avg)</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <span className="text-slate-600">{performance.losses}L (${performance.avgLoss.toFixed(2)} avg)</span>
            </div>
          </div>
        )}

        {/* Targets */}
        {(strategy.win_rate_target || strategy.risk_reward_target) && (
          <div className="pt-3 border-t border-slate-200">
            <div className="text-sm font-medium text-slate-700 mb-2">Targets:</div>
            <div className="space-y-1 text-sm text-slate-600">
              {strategy.win_rate_target && (
                <div>Win Rate: {strategy.win_rate_target}%</div>
              )}
              {strategy.risk_reward_target && (
                <div>Risk:Reward: 1:{strategy.risk_reward_target}</div>
              )}
            </div>
          </div>
        )}

        {/* Entry/Exit Criteria */}
        {(strategy.entry_criteria || strategy.exit_criteria) && (
          <div className="pt-3 border-t border-slate-200 space-y-2">
            {strategy.entry_criteria && (
              <div>
                <div className="text-sm font-medium text-slate-700">Entry:</div>
                <p className="text-sm text-slate-600 line-clamp-2">{strategy.entry_criteria}</p>
              </div>
            )}
            {strategy.exit_criteria && (
              <div>
                <div className="text-sm font-medium text-slate-700">Exit:</div>
                <p className="text-sm text-slate-600 line-clamp-2">{strategy.exit_criteria}</p>
              </div>
            )}
          </div>
        )}

        {/* Rules */}
        {strategy.rules && strategy.rules.length > 0 && (
          <div className="pt-3 border-t border-slate-200">
            <div className="text-sm font-medium text-slate-700 mb-2">Rules ({strategy.rules.length}):</div>
            <ul className="space-y-1">
              {strategy.rules.slice(0, 3).map((rule, idx) => (
                <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span className="line-clamp-1">{rule}</span>
                </li>
              ))}
              {strategy.rules.length > 3 && (
                <li className="text-sm text-slate-500 italic">
                  +{strategy.rules.length - 3} more rules...
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Instruments & Timeframes */}
        {((strategy.instruments && strategy.instruments.length > 0) || 
          (strategy.timeframes && strategy.timeframes.length > 0)) && (
          <div className="flex flex-wrap gap-2">
            {strategy.instruments && strategy.instruments.map((inst, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {inst}
              </Badge>
            ))}
            {strategy.timeframes && strategy.timeframes.map((tf, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {tf}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}