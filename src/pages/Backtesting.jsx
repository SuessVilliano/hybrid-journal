import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Plus, History } from 'lucide-react';
import BacktestForm from '@/components/backtesting/BacktestForm';
import BacktestResults from '@/components/backtesting/BacktestResults';
import BacktestHistory from '@/components/backtesting/BacktestHistory';

export default function Backtesting() {
  const [showForm, setShowForm] = useState(false);
  const [selectedBacktest, setSelectedBacktest] = useState(null);
  const [runningBacktest, setRunningBacktest] = useState(false);

  const queryClient = useQueryClient();

  const { data: backtests = [], isLoading } = useQuery({
    queryKey: ['backtests'],
    queryFn: () => base44.entities.Backtest.list('-created_date', 100)
  });

  const { data: strategies = [] } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => base44.entities.Strategy.list()
  });

  const { data: trades = [] } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-entry_date', 1000)
  });

  const runBacktest = async (config) => {
    setRunningBacktest(true);
    
    try {
      // Simple client-side backtest simulation using historical trades
      const { symbol, start_date, end_date, initial_capital, entry_rules, exit_rules, strategy_name } = config;
      
      // Filter trades that match the backtest criteria
      const relevantTrades = trades.filter(t => {
        if (symbol && t.symbol !== symbol) return false;
        if (start_date && new Date(t.entry_date) < new Date(start_date)) return false;
        if (end_date && new Date(t.entry_date) > new Date(end_date)) return false;
        if (strategy_name && t.strategy !== strategy_name) return false;
        return true;
      });

      // Calculate backtest results
      let equity = initial_capital;
      const equityCurve = [];
      let maxEquity = initial_capital;
      let maxDrawdown = 0;
      
      const wins = relevantTrades.filter(t => t.pnl > 0);
      const losses = relevantTrades.filter(t => t.pnl < 0);
      
      relevantTrades.forEach((trade, idx) => {
        equity += trade.pnl || 0;
        equityCurve.push({
          trade: idx + 1,
          equity: equity,
          date: trade.entry_date
        });
        
        if (equity > maxEquity) maxEquity = equity;
        const drawdown = ((maxEquity - equity) / maxEquity) * 100;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      });

      const totalReturn = ((equity - initial_capital) / initial_capital) * 100;
      const avgWin = wins.length > 0 ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0;
      const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length) : 0;
      const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;

      const result = {
        name: config.name || `Backtest ${new Date().toLocaleDateString()}`,
        strategy_name: strategy_name || 'N/A',
        symbol: symbol || 'All',
        timeframe: config.timeframe || '1h',
        start_date: start_date,
        end_date: end_date,
        initial_capital: initial_capital,
        final_equity: equity,
        total_return: totalReturn,
        total_trades: relevantTrades.length,
        winning_trades: wins.length,
        losing_trades: losses.length,
        win_rate: relevantTrades.length > 0 ? (wins.length / relevantTrades.length) * 100 : 0,
        profit_factor: profitFactor,
        max_drawdown: maxDrawdown,
        sharpe_ratio: 0, // Simplified - would need returns std dev
        avg_win: avgWin,
        avg_loss: avgLoss,
        largest_win: wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0,
        largest_loss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0,
        equity_curve: equityCurve,
        entry_rules: entry_rules || '',
        exit_rules: exit_rules || '',
        notes: `Backtested on ${relevantTrades.length} historical trades`
      };

      // Save backtest
      const saved = await base44.entities.Backtest.create(result);
      queryClient.invalidateQueries(['backtests']);
      setSelectedBacktest(saved);
      setShowForm(false);
    } catch (error) {
      console.error('Backtest error:', error);
      alert('Backtest failed: ' + error.message);
    } finally {
      setRunningBacktest(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Backtesting</h1>
            <p className="text-slate-600 mt-1">Test your strategies on historical data</p>
          </div>
          <Button
            onClick={() => {
              setSelectedBacktest(null);
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Play className="h-4 w-4" />
            New Backtest
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Play className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Historical Trade Backtesting</h3>
                <p className="text-sm text-slate-700">
                  Test your strategies against your actual trading history. Select a date range, 
                  strategy, and symbol to see how your approach would have performed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selected Backtest Results */}
        {selectedBacktest && (
          <BacktestResults backtest={selectedBacktest} onClose={() => setSelectedBacktest(null)} />
        )}

        {/* Backtest History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Backtest History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {backtests.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 mb-4">No backtests run yet</p>
                <Button
                  onClick={() => setShowForm(true)}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  Run Your First Backtest
                </Button>
              </div>
            ) : (
              <BacktestHistory 
                backtests={backtests} 
                onSelect={setSelectedBacktest}
              />
            )}
          </CardContent>
        </Card>

        {/* Backtest Form Modal */}
        {showForm && (
          <BacktestForm
            strategies={strategies}
            trades={trades}
            onRun={runBacktest}
            onCancel={() => setShowForm(false)}
            running={runningBacktest}
          />
        )}
      </div>
    </div>
  );
}