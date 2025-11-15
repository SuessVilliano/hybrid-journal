import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

export default function TradeForm({ trade, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(trade || {
    symbol: '',
    platform: 'DXTrade',
    instrument_type: 'Forex',
    side: 'Long',
    entry_date: new Date().toISOString().slice(0, 16),
    exit_date: '',
    entry_price: '',
    exit_price: '',
    quantity: '',
    stop_loss: '',
    take_profit: '',
    commission: 0,
    swap: 0,
    pnl: '',
    strategy: '',
    notes: '',
    emotion_before: 'Calm',
    followed_rules: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Calculate P&L if not provided
    let calculatedPnl = parseFloat(formData.pnl) || 0;
    if (!calculatedPnl && formData.entry_price && formData.exit_price && formData.quantity) {
      const entry = parseFloat(formData.entry_price);
      const exit = parseFloat(formData.exit_price);
      const qty = parseFloat(formData.quantity);
      const direction = formData.side === 'Long' ? 1 : -1;
      calculatedPnl = ((exit - entry) * direction * qty) - (parseFloat(formData.commission) || 0) - (parseFloat(formData.swap) || 0);
    }

    onSubmit({
      ...formData,
      pnl: calculatedPnl,
      entry_price: parseFloat(formData.entry_price) || 0,
      exit_price: parseFloat(formData.exit_price) || 0,
      quantity: parseFloat(formData.quantity) || 0,
      stop_loss: parseFloat(formData.stop_loss) || null,
      take_profit: parseFloat(formData.take_profit) || null,
      commission: parseFloat(formData.commission) || 0,
      swap: parseFloat(formData.swap) || 0
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">
            {trade ? 'Edit Trade' : 'Add New Trade'}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Symbol *</label>
              <Input
                value={formData.symbol}
                onChange={(e) => setFormData({...formData, symbol: e.target.value})}
                placeholder="EURUSD, NQ, BTC/USD"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Platform</label>
              <Select value={formData.platform} onValueChange={(val) => setFormData({...formData, platform: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DXTrade">DXTrade</SelectItem>
                  <SelectItem value="cTrader">cTrader</SelectItem>
                  <SelectItem value="MatchTrader">MatchTrader</SelectItem>
                  <SelectItem value="Rithmic">Rithmic</SelectItem>
                  <SelectItem value="MT4">MetaTrader 4</SelectItem>
                  <SelectItem value="MT5">MetaTrader 5</SelectItem>
                  <SelectItem value="Tradovate">Tradovate</SelectItem>
                  <SelectItem value="NinjaTrader">NinjaTrader</SelectItem>
                  <SelectItem value="TradingView">TradingView</SelectItem>
                  <SelectItem value="Binance">Binance</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Instrument Type</label>
              <Select value={formData.instrument_type} onValueChange={(val) => setFormData({...formData, instrument_type: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Forex">Forex</SelectItem>
                  <SelectItem value="Futures">Futures</SelectItem>
                  <SelectItem value="Stocks">Stocks</SelectItem>
                  <SelectItem value="Options">Options</SelectItem>
                  <SelectItem value="Crypto">Crypto</SelectItem>
                  <SelectItem value="CFD">CFD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Side</label>
              <Select value={formData.side} onValueChange={(val) => setFormData({...formData, side: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Long">Long</SelectItem>
                  <SelectItem value="Short">Short</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Entry & Exit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Entry Date & Time *</label>
              <Input
                type="datetime-local"
                value={formData.entry_date}
                onChange={(e) => setFormData({...formData, entry_date: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Exit Date & Time</label>
              <Input
                type="datetime-local"
                value={formData.exit_date}
                onChange={(e) => setFormData({...formData, exit_date: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Entry Price</label>
              <Input
                type="number"
                step="any"
                value={formData.entry_price}
                onChange={(e) => setFormData({...formData, entry_price: e.target.value})}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Exit Price</label>
              <Input
                type="number"
                step="any"
                value={formData.exit_price}
                onChange={(e) => setFormData({...formData, exit_price: e.target.value})}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity/Lots</label>
              <Input
                type="number"
                step="any"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                placeholder="1.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">P&L *</label>
              <Input
                type="number"
                step="any"
                value={formData.pnl}
                onChange={(e) => setFormData({...formData, pnl: e.target.value})}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          {/* Risk Management */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Stop Loss</label>
              <Input
                type="number"
                step="any"
                value={formData.stop_loss}
                onChange={(e) => setFormData({...formData, stop_loss: e.target.value})}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Take Profit</label>
              <Input
                type="number"
                step="any"
                value={formData.take_profit}
                onChange={(e) => setFormData({...formData, take_profit: e.target.value})}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Commission</label>
              <Input
                type="number"
                step="any"
                value={formData.commission}
                onChange={(e) => setFormData({...formData, commission: e.target.value})}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Strategy & Psychology */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Strategy</label>
              <Input
                value={formData.strategy}
                onChange={(e) => setFormData({...formData, strategy: e.target.value})}
                placeholder="Breakout, Scalping, Swing..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Emotion Before Trade</label>
              <Select value={formData.emotion_before} onValueChange={(val) => setFormData({...formData, emotion_before: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Confident">Confident</SelectItem>
                  <SelectItem value="Anxious">Anxious</SelectItem>
                  <SelectItem value="Calm">Calm</SelectItem>
                  <SelectItem value="Excited">Excited</SelectItem>
                  <SelectItem value="Fearful">Fearful</SelectItem>
                  <SelectItem value="Impatient">Impatient</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="What was your reasoning? What went well? What could be improved?"
              rows={4}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {trade ? 'Update Trade' : 'Save Trade'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}