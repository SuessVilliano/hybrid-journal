import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Info, TrendingUp, AlertCircle } from 'lucide-react';
import AdvancedBacktestForm from '@/components/backtesting/AdvancedBacktestForm';
import BacktestResults from '@/components/backtesting/BacktestResults';
import BacktestHistory from '@/components/backtesting/BacktestHistory';
import { runBacktest, optimizeParameters } from '@/components/backtesting/BacktestEngine';

export default function Backtesting() {
  const [showForm, setShowForm] = useState(false);
  const [selectedBacktest, setSelectedBacktest] = useState(null);
  const [running, setRunning] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState(null);

  const queryClient = useQueryClient();

  const { data: backtests = [] } = useQuery({
    queryKey: ['backtests'],
    queryFn: () => base44.entities.Backtest.list('-created_date', 50)
  });

  const { data: strategies = [] } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => base44.entities.Strategy.list('-created_date', 100)
  });

  const createBacktestMutation = useMutation({
    mutationFn: (data) => base44.entities.Backtest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['backtests']);
    }
  });

  const handleRunBacktest = async (config, optimizationParams) => {
    try {
      if (optimizationParams) {
        setOptimizing(true);
        const results = await optimizeParameters(config, optimizationParams, 'totalReturn');
        setOptimizationResults(results);
        setOptimizing(false);
        
        // Run backtest with best parameters
        const bestParams = results[0].params;
        const finalConfig = { ...config, ...bestParams };
        await executeBacktest(finalConfig);
      } else {
        await executeBacktest(config);
      }
    } catch (error) {
      console.error('Backtest error:', error);
      alert('Backtest failed: ' + error.message);
      setRunning(false);
      setOptimizing(false);
    }
  };

  const executeBacktest = async (config) => {
    setRunning(true);
    
    const result = await runBacktest(config);
    
    const backtestData = {
      name: config.name || `${config.symbol} Backtest`,
      strategy_name: config.name,
      symbol: config.symbol,
      timeframe: config.timeframe,
      start_date: config.startDate,
      end_date: config.endDate,
      initial_capital: config.initialCapital,
      final_equity: result.stats.finalEquity,
      total_return: result.stats.totalReturn,
      total_trades: result.stats.totalTrades,
      winning_trades: result.stats.winningTrades,
      losing_trades: result.stats.losingTrades,
      win_rate: result.stats.winRate,
      profit_factor: result.stats.profitFactor,
      max_drawdown: result.stats.maxDrawdown,
      sharpe_ratio: 0,
      avg_win: result.stats.avgWin,
      avg_loss: result.stats.avgLoss,
      largest_win: result.stats.largestWin,
      largest_loss: result.stats.largestLoss,
      equity_curve: result.equityCurve,
      entry_rules: config.strategy.longEntry,
      exit_rules: config.strategy.exitCondition || 'Stop Loss / Take Profit',
      notes: `Indicators: ${config.indicators.map(i => `${i.type}(${i.period})`).join(', ')}`
    };

    const created = await createBacktestMutation.mutateAsync(backtestData);
    setSelectedBacktest(created);
    setShowForm(false);
    setRunning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Strategy Backtesting</h1>
            <p className="text-slate-600 mt-1">Test your strategies with advanced simulation</p>
          </div>
          <Button
            onClick={() => {
              setShowForm(true);
              setSelectedBacktest(null);
              setOptimizationResults(null);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            disabled={running || optimizing}
          >
            <Play className="h-4 w-4" />
            New Backtest
          </Button>
        </div>

        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 mb-2">Advanced Backtesting Features</h3>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>✓ Real-time historical data fetching with AI</li>
                  <li>✓ Custom technical indicators (SMA, EMA, RSI, MACD, Bollinger Bands, ATR)</li>
                  <li>✓ Flexible entry/exit rules using JavaScript conditions</li>
                  <li>✓ Parameter optimization to find best settings</li>
                  <li>✓ Comprehensive performance metrics and equity curves</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {running && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Running backtest simulation...</p>
                <p className="text-sm text-blue-700">Fetching data and executing strategy rules</p>
              </div>
            </CardContent>
          </Card>
        )}

        {optimizing && (
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
              <div>
                <p className="font-medium text-purple-900">Optimizing parameters...</p>
                <p className="text-sm text-purple-700">Testing different parameter combinations</p>
              </div>
            </CardContent>
          </Card>
        )}

        {optimizationResults && (
          <Card>
            <CardHeader>
              <CardTitle>Optimization Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {optimizationResults.slice(0, 5).map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">
                          Risk: {result.params.riskPercent}% | SL: {result.params.stopLossPercent}%
                        </div>
                        <div className="text-sm text-slate-600">
                          Win Rate: {result.stats.winRate.toFixed(1)}% | Trades: {result.stats.totalTrades}
                        </div>
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${result.stats.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {result.stats.totalReturn >= 0 ? '+' : ''}{result.stats.totalReturn.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {selectedBacktest && (
          <BacktestResults
            backtest={selectedBacktest}
            onClose={() => setSelectedBacktest(null)}
          />
        )}

        <BacktestHistory
          backtests={backtests}
          onSelect={setSelectedBacktest}
        />

        {showForm && (
          <AdvancedBacktestForm
            onRun={handleRunBacktest}
            onCancel={() => setShowForm(false)}
            strategies={strategies}
          />
        )}
      </div>
    </div>
  );
}