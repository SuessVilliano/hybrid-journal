import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Sparkles, Play, Pause } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function StrategyBuilder({ strategy, brokerConnections, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(strategy || {
    name: '',
    description: '',
    status: 'paused',
    mode: 'simulated',
    broker_connection_id: '',
    symbols: ['EURUSD'],
    timeframe: '1h',
    entry_conditions: [],
    exit_conditions: [],
    risk_management: {
      max_position_size: 1,
      risk_per_trade_percent: 2,
      stop_loss_percent: 2,
      take_profit_percent: 4,
      max_daily_loss: 500,
      max_open_trades: 3
    },
    ai_settings: {
      use_ai_predictions: true,
      confidence_threshold: 70,
      sentiment_analysis: true
    }
  });

  const [newSymbol, setNewSymbol] = useState('');
  const [newEntryCondition, setNewEntryCondition] = useState('');
  const [newExitCondition, setNewExitCondition] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);

  const generateAIStrategy = async () => {
    setAiGenerating(true);
    try {
      const prompt = `Generate a profitable automated trading strategy for ${formData.symbols.join(', ')}.
      
Provide:
1. Entry conditions (use technical indicators like SMA, EMA, RSI, MACD)
2. Exit conditions
3. Risk management suggestions

Format as simple JavaScript conditions (e.g., "close > SMA_50 && RSI_14 < 30")`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            entry_conditions: { type: "array", items: { type: "string" } },
            exit_conditions: { type: "array", items: { type: "string" } }
          }
        }
      });

      setFormData({
        ...formData,
        entry_conditions: result.entry_conditions || [],
        exit_conditions: result.exit_conditions || []
      });
    } catch (error) {
      alert('AI generation failed: ' + error.message);
    } finally {
      setAiGenerating(false);
    }
  };

  const addSymbol = () => {
    if (newSymbol && !formData.symbols.includes(newSymbol)) {
      setFormData({ ...formData, symbols: [...formData.symbols, newSymbol.toUpperCase()] });
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbol) => {
    setFormData({ ...formData, symbols: formData.symbols.filter(s => s !== symbol) });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
        <CardHeader className="border-b flex flex-row items-center justify-between">
          <CardTitle>{strategy ? 'Edit' : 'Create'} Automated Strategy</CardTitle>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Strategy Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="AI Breakout Strategy"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Mode</label>
              <Select value={formData.mode} onValueChange={(val) => setFormData({...formData, mode: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simulated">Simulated (Paper Trading)</SelectItem>
                  <SelectItem value="live">Live Trading ⚡</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2}
            />
          </div>

          {/* Broker Connection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Broker Connection</label>
            <Select value={formData.broker_connection_id} onValueChange={(val) => setFormData({...formData, broker_connection_id: val})}>
              <SelectTrigger>
                <SelectValue placeholder="Select broker..." />
              </SelectTrigger>
              <SelectContent>
                {brokerConnections.map(conn => (
                  <SelectItem key={conn.id} value={conn.id}>
                    {conn.broker_name} - {conn.account_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Symbols */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Trading Symbols</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                placeholder="EURUSD, BTCUSD..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSymbol())}
              />
              <Button onClick={addSymbol}><Plus className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.symbols.map(symbol => (
                <span key={symbol} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  {symbol}
                  <button onClick={() => removeSymbol(symbol)}><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          </div>

          {/* AI Strategy Generator */}
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-900">AI Strategy Generator</p>
                  <p className="text-sm text-slate-600">Let AI create entry/exit conditions</p>
                </div>
                <Button onClick={generateAIStrategy} disabled={aiGenerating} className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="h-4 w-4 mr-2" />
                  {aiGenerating ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Entry Conditions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Entry Conditions</label>
            <div className="space-y-2">
              {formData.entry_conditions.map((cond, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input value={cond} onChange={(e) => {
                    const newConds = [...formData.entry_conditions];
                    newConds[idx] = e.target.value;
                    setFormData({...formData, entry_conditions: newConds});
                  }} />
                  <Button variant="ghost" onClick={() => setFormData({...formData, entry_conditions: formData.entry_conditions.filter((_, i) => i !== idx)})}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setFormData({...formData, entry_conditions: [...formData.entry_conditions, '']})}>
                <Plus className="h-4 w-4 mr-1" /> Add Condition
              </Button>
            </div>
          </div>

          {/* Exit Conditions */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Exit Conditions</label>
            <div className="space-y-2">
              {formData.exit_conditions.map((cond, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input value={cond} onChange={(e) => {
                    const newConds = [...formData.exit_conditions];
                    newConds[idx] = e.target.value;
                    setFormData({...formData, exit_conditions: newConds});
                  }} />
                  <Button variant="ghost" onClick={() => setFormData({...formData, exit_conditions: formData.exit_conditions.filter((_, i) => i !== idx)})}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setFormData({...formData, exit_conditions: [...formData.exit_conditions, '']})}>
                <Plus className="h-4 w-4 mr-1" /> Add Condition
              </Button>
            </div>
          </div>

          {/* Risk Management */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Management</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-slate-600">Risk Per Trade (%)</label>
                <Input type="number" step="0.1" value={formData.risk_management.risk_per_trade_percent}
                  onChange={(e) => setFormData({...formData, risk_management: {...formData.risk_management, risk_per_trade_percent: parseFloat(e.target.value)}})} />
              </div>
              <div>
                <label className="text-sm text-slate-600">Stop Loss (%)</label>
                <Input type="number" step="0.1" value={formData.risk_management.stop_loss_percent}
                  onChange={(e) => setFormData({...formData, risk_management: {...formData.risk_management, stop_loss_percent: parseFloat(e.target.value)}})} />
              </div>
              <div>
                <label className="text-sm text-slate-600">Take Profit (%)</label>
                <Input type="number" step="0.1" value={formData.risk_management.take_profit_percent}
                  onChange={(e) => setFormData({...formData, risk_management: {...formData.risk_management, take_profit_percent: parseFloat(e.target.value)}})} />
              </div>
              <div>
                <label className="text-sm text-slate-600">Max Daily Loss ($)</label>
                <Input type="number" value={formData.risk_management.max_daily_loss}
                  onChange={(e) => setFormData({...formData, risk_management: {...formData.risk_management, max_daily_loss: parseFloat(e.target.value)}})} />
              </div>
              <div>
                <label className="text-sm text-slate-600">Max Open Trades</label>
                <Input type="number" value={formData.risk_management.max_open_trades}
                  onChange={(e) => setFormData({...formData, risk_management: {...formData.risk_management, max_open_trades: parseInt(e.target.value)}})} />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onCancel}>Cancel</Button>
            <Button onClick={() => onSubmit(formData)} className="bg-blue-600 hover:bg-blue-700">
              {strategy ? 'Update' : 'Create'} Strategy
            </Button>
          </div>
        </CardContent>
      </div>
    </div>
  );
}