import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Play } from 'lucide-react';

export default function BacktestForm({ strategies, trades, onRun, onCancel, running }) {
  const [config, setConfig] = useState({
    name: '',
    strategy_name: '',
    symbol: '',
    timeframe: '1h',
    start_date: '',
    end_date: '',
    initial_capital: 10000,
    entry_rules: '',
    exit_rules: ''
  });

  const availableSymbols = useMemo(() => {
    return [...new Set(trades.map(t => t.symbol))].sort();
  }, [trades]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onRun(config);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">Run Backtest</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Backtest Name *</label>
            <Input
              value={config.name}
              onChange={(e) => setConfig({...config, name: e.target.value})}
              placeholder="e.g., EURUSD Breakout Test"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Strategy (Optional)</label>
              <Select value={config.strategy_name} onValueChange={(val) => setConfig({...config, strategy_name: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Strategies</SelectItem>
                  {strategies.map(s => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Symbol (Optional)</label>
              <Select value={config.symbol} onValueChange={(val) => setConfig({...config, symbol: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>All Symbols</SelectItem>
                  {availableSymbols.map(sym => (
                    <SelectItem key={sym} value={sym}>{sym}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <SelectItem value="1d">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Initial Capital *</label>
              <Input
                type="number"
                step="any"
                value={config.initial_capital}
                onChange={(e) => setConfig({...config, initial_capital: parseFloat(e.target.value)})}
                placeholder="10000"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <Input
                type="date"
                value={config.start_date}
                onChange={(e) => setConfig({...config, start_date: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">End Date</label>
              <Input
                type="date"
                value={config.end_date}
                onChange={(e) => setConfig({...config, end_date: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Entry Rules (Optional)</label>
            <Textarea
              value={config.entry_rules}
              onChange={(e) => setConfig({...config, entry_rules: e.target.value})}
              placeholder="Describe your entry logic..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Exit Rules (Optional)</label>
            <Textarea
              value={config.exit_rules}
              onChange={(e) => setConfig({...config, exit_rules: e.target.value})}
              placeholder="Describe your exit logic..."
              rows={3}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This backtest will analyze your historical trades matching the criteria above. 
              For forward testing with new data, you'll need to connect live market data feeds.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onCancel} disabled={running}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={running}>
              {running ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Run Backtest
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}