import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, TrendingDown, Target, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function BacktestResults({ backtest, onClose }) {
  if (!backtest) return null;

  const meetsTargets = backtest.win_rate >= 50 && backtest.profit_factor >= 1.5;

  return (
    <div className="space-y-6">
      <Card className={`border-2 ${meetsTargets ? 'border-green-500 bg-green-50' : 'border-blue-200'}`}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl mb-2">{backtest.name}</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{backtest.symbol || 'All Symbols'}</Badge>
              <Badge variant="outline">{backtest.strategy_name || 'All Strategies'}</Badge>
              <Badge variant="outline">{backtest.timeframe}</Badge>
              {meetsTargets && (
                <Badge className="bg-green-600">Profitable Strategy ✓</Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-sm text-slate-600 mb-1">Total Return</div>
              <div className={`text-2xl font-bold ${backtest.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {backtest.total_return >= 0 ? '+' : ''}{backtest.total_return?.toFixed(2)}%
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-sm text-slate-600 mb-1">Win Rate</div>
              <div className="text-2xl font-bold text-blue-600">
                {backtest.win_rate?.toFixed(1)}%
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-sm text-slate-600 mb-1">Profit Factor</div>
              <div className="text-2xl font-bold text-purple-600">
                {backtest.profit_factor?.toFixed(2)}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-sm text-slate-600 mb-1">Max Drawdown</div>
              <div className="text-2xl font-bold text-orange-600">
                -{backtest.max_drawdown?.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Equity Curve */}
          {backtest.equity_curve && backtest.equity_curve.length > 0 && (
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-bold text-slate-900 mb-4">Equity Curve</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={backtest.equity_curve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="trade" 
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
                      borderRadius: '8px'
                    }}
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Equity']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="equity" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-slate-900 mb-3">Trade Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Trades:</span>
                  <span className="font-medium">{backtest.total_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Winning Trades:</span>
                  <span className="font-medium text-green-600">{backtest.winning_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Losing Trades:</span>
                  <span className="font-medium text-red-600">{backtest.losing_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Avg Win:</span>
                  <span className="font-medium text-green-600">${backtest.avg_win?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Avg Loss:</span>
                  <span className="font-medium text-red-600">-${backtest.avg_loss?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-slate-900 mb-3">Capital & Returns</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Initial Capital:</span>
                  <span className="font-medium">${backtest.initial_capital?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Final Equity:</span>
                  <span className="font-medium">${backtest.final_equity?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Largest Win:</span>
                  <span className="font-medium text-green-600">${backtest.largest_win?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Largest Loss:</span>
                  <span className="font-medium text-red-600">${Math.abs(backtest.largest_loss || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Net Profit:</span>
                  <span className={`font-medium ${(backtest.final_equity - backtest.initial_capital) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${(backtest.final_equity - backtest.initial_capital).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Rules */}
          {(backtest.entry_rules || backtest.exit_rules) && (
            <div className="bg-white rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-slate-900">Strategy Rules</h3>
              {backtest.entry_rules && (
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Entry:</div>
                  <p className="text-sm text-slate-600">{backtest.entry_rules}</p>
                </div>
              )}
              {backtest.exit_rules && (
                <div>
                  <div className="text-sm font-medium text-slate-700 mb-1">Exit:</div>
                  <p className="text-sm text-slate-600">{backtest.exit_rules}</p>
                </div>
              )}
            </div>
          )}

          {backtest.notes && (
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600">{backtest.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}