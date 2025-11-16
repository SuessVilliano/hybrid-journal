import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Settings, TrendingUp, Target } from 'lucide-react';

export default function StrategyCard({ strategy, onToggle, onEdit, onStop }) {
  const getStatusColor = () => {
    switch (strategy.status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'stopped': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getModeColor = () => {
    return strategy.mode === 'live' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">{strategy.name}</CardTitle>
          <p className="text-sm text-slate-600">{strategy.description}</p>
        </div>
        <div className="flex gap-2">
          <Badge className={getStatusColor()}>{strategy.status}</Badge>
          <Badge className={getModeColor()}>{strategy.mode}</Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Symbols */}
          <div>
            <div className="text-sm text-slate-600 mb-1">Trading Symbols</div>
            <div className="flex flex-wrap gap-1">
              {strategy.symbols?.map(symbol => (
                <span key={symbol} className="bg-slate-100 px-2 py-1 rounded text-xs">{symbol}</span>
              ))}
            </div>
          </div>

          {/* Stats */}
          {strategy.statistics && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="text-xs text-slate-600">Win Rate</div>
                <div className="text-lg font-bold text-slate-900">
                  {strategy.statistics.win_rate?.toFixed(1) || 0}%
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-600">Total P&L</div>
                <div className={`text-lg font-bold ${strategy.statistics.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${strategy.statistics.total_pnl?.toFixed(2) || 0}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-600">Signals</div>
                <div className="text-sm font-medium">{strategy.statistics.total_signals || 0}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600">Executed</div>
                <div className="text-sm font-medium">{strategy.statistics.trades_executed || 0}</div>
              </div>
            </div>
          )}

          {/* Risk Management */}
          <div className="text-sm text-slate-600">
            Risk: {strategy.risk_management?.risk_per_trade_percent}% | 
            SL: {strategy.risk_management?.stop_loss_percent}% | 
            TP: {strategy.risk_management?.take_profit_percent}%
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {strategy.status !== 'active' ? (
              <Button size="sm" onClick={() => onToggle(strategy)} className="flex-1 bg-green-600 hover:bg-green-700">
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            ) : (
              <Button size="sm" onClick={() => onToggle(strategy)} className="flex-1 bg-yellow-600 hover:bg-yellow-700">
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => onEdit(strategy)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => onStop(strategy)}>
              <Square className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}