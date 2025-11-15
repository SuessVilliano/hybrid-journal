import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Trash2, Play, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AdvancedBacktestForm({ onRun, onCancel, strategies }) {
  const [config, setConfig] = useState({
    name: '',
    symbol: 'EURUSD',
    timeframe: '1h',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    initialCapital: 10000,
    riskPercent: 2,
    strategy: {
      longEntry: 'close > SMA_50 && RSI_14 < 30',
      shortEntry: 'close < SMA_50 && RSI_14 > 70',
      exitCondition: '',
      stopLossPercent: 2,
      takeProfitPercent: 4
    },
    indicators: [
      { type: 'SMA', period: 50 },
      { type: 'RSI', period: 14 }
    ]
  });

  const [showOptimization, setShowOptimization] = useState(false);
  const [optimizationParams, setOptimizationParams] = useState({
    riskPercent: { min: 1, max: 5, step: 1 },
    stopLossPercent: { min: 1, max: 3, step: 0.5 }
  });

  const handleAddIndicator = () => {
    setConfig({
      ...config,
      indicators: [...config.indicators, { type: 'SMA', period: 20 }]
    });
  };

  const handleRemoveIndicator = (index) => {
    setConfig({
      ...config,
      indicators: config.indicators.filter((_, i) => i !== index)
    });
  };

  const handleIndicatorChange = (index, field, value) => {
    const newIndicators = [...config.indicators];
    newIndicators[index] = { ...newIndicators[index], [field]: value };
    setConfig({ ...config, indicators: newIndicators });
  };

  const handleSubmit = (optimize = false) => {
    if (optimize) {
      onRun(config, optimizationParams);
    } else {
      onRun(config);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center rounded-t-xl z-10">
          <h2 className="text-2xl font-bold text-slate-900">Advanced Backtesting</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Basic Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Backtest Name</label>
                  <Input
                    value={config.name}
                    onChange={(e) => setConfig({...config, name: e.target.value})}
                    placeholder="My Strategy Backtest"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Symbol</label>
                  <Input
                    value={config.symbol}
                    onChange={(e) => setConfig({...config, symbol: e.target.value})}
                    placeholder="EURUSD, BTCUSD, AAPL"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Timeframe</label>
                  <Select value={config.timeframe} onValueChange={(val) => setConfig({...config, timeframe: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1m">1 Minute</SelectItem>
                      <SelectItem value="5m">5 Minutes</SelectItem>
                      <SelectItem value="15m">15 Minutes</SelectItem>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="4h">4 Hours</SelectItem>
                      <SelectItem value="1d">1 Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Initial Capital ($)</label>
                  <Input
                    type="number"
                    value={config.initialCapital}
                    onChange={(e) => setConfig({...config, initialCapital: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
                  <Input
                    type="date"
                    value={config.startDate}
                    onChange={(e) => setConfig({...config, startDate: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
                  <Input
                    type="date"
                    value={config.endDate}
                    onChange={(e) => setConfig({...config, endDate: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Indicators */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Technical Indicators</CardTitle>
              <Button size="sm" onClick={handleAddIndicator} variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Add Indicator
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.indicators.map((indicator, idx) => (
                <div key={idx} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Type</label>
                    <Select value={indicator.type} onValueChange={(val) => handleIndicatorChange(idx, 'type', val)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SMA">Simple Moving Average</SelectItem>
                        <SelectItem value="EMA">Exponential Moving Average</SelectItem>
                        <SelectItem value="RSI">Relative Strength Index</SelectItem>
                        <SelectItem value="MACD">MACD</SelectItem>
                        <SelectItem value="Bollinger">Bollinger Bands</SelectItem>
                        <SelectItem value="ATR">Average True Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Period</label>
                    <Input
                      type="number"
                      value={indicator.period || 14}
                      onChange={(e) => handleIndicatorChange(idx, 'period', parseInt(e.target.value))}
                    />
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => handleRemoveIndicator(idx)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {config.indicators.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4">No indicators added yet</p>
              )}
            </CardContent>
          </Card>

          {/* Strategy Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Strategy Rules</CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Use JavaScript conditions. Available: open, high, low, close, volume, SMA_X, EMA_X, RSI_X, MACD, etc.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Long Entry Condition</label>
                <Textarea
                  value={config.strategy.longEntry}
                  onChange={(e) => setConfig({...config, strategy: {...config.strategy, longEntry: e.target.value}})}
                  placeholder="close > SMA_50 && RSI_14 < 30"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Short Entry Condition</label>
                <Textarea
                  value={config.strategy.shortEntry}
                  onChange={(e) => setConfig({...config, strategy: {...config.strategy, shortEntry: e.target.value}})}
                  placeholder="close < SMA_50 && RSI_14 > 70"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Exit Condition (Optional)</label>
                <Textarea
                  value={config.strategy.exitCondition}
                  onChange={(e) => setConfig({...config, strategy: {...config.strategy, exitCondition: e.target.value}})}
                  placeholder="RSI_14 > 50 (for longs) or RSI_14 < 50 (for shorts)"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Risk Per Trade (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.riskPercent}
                    onChange={(e) => setConfig({...config, riskPercent: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Stop Loss (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.strategy.stopLossPercent}
                    onChange={(e) => setConfig({...config, strategy: {...config.strategy, stopLossPercent: parseFloat(e.target.value)}})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Take Profit (%)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={config.strategy.takeProfitPercent}
                    onChange={(e) => setConfig({...config, strategy: {...config.strategy, takeProfitPercent: parseFloat(e.target.value)}})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optimization */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Parameter Optimization</CardTitle>
                <Button
                  size="sm"
                  variant={showOptimization ? "default" : "outline"}
                  onClick={() => setShowOptimization(!showOptimization)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {showOptimization ? 'Hide' : 'Configure'}
                </Button>
              </div>
            </CardHeader>
            {showOptimization && (
              <CardContent>
                <p className="text-sm text-slate-600 mb-4">
                  Define parameter ranges to test. The system will run multiple backtests to find optimal values.
                </p>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-slate-700 mb-1">Parameter</label>
                      <Badge>Risk %</Badge>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Min</label>
                      <Input
                        type="number"
                        size="sm"
                        value={optimizationParams.riskPercent.min}
                        onChange={(e) => setOptimizationParams({
                          ...optimizationParams,
                          riskPercent: {...optimizationParams.riskPercent, min: parseFloat(e.target.value)}
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Max</label>
                      <Input
                        type="number"
                        size="sm"
                        value={optimizationParams.riskPercent.max}
                        onChange={(e) => setOptimizationParams({
                          ...optimizationParams,
                          riskPercent: {...optimizationParams.riskPercent, max: parseFloat(e.target.value)}
                        })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Step</label>
                      <Input
                        type="number"
                        size="sm"
                        step="0.1"
                        value={optimizationParams.riskPercent.step}
                        onChange={(e) => setOptimizationParams({
                          ...optimizationParams,
                          riskPercent: {...optimizationParams.riskPercent, step: parseFloat(e.target.value)}
                        })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-200 p-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          {showOptimization && (
            <Button onClick={() => handleSubmit(true)} className="bg-purple-600 hover:bg-purple-700">
              <Settings className="h-4 w-4 mr-2" />
              Run Optimization
            </Button>
          )}
          <Button onClick={() => handleSubmit(false)} className="bg-blue-600 hover:bg-blue-700">
            <Play className="h-4 w-4 mr-2" />
            Run Backtest
          </Button>
        </div>
      </div>
    </div>
  );
}