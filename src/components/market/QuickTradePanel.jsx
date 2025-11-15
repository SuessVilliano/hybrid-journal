import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function QuickTradePanel({ symbol, currentPrice, onClose }) {
  const [side, setSide] = useState('Long');
  const [quantity, setQuantity] = useState(1);
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [notes, setNotes] = useState('');
  
  const queryClient = useQueryClient();

  const createTradeMutation = useMutation({
    mutationFn: (data) => base44.entities.Trade.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['trades']);
      onClose();
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const tradeData = {
      symbol,
      side,
      entry_price: currentPrice,
      quantity: parseFloat(quantity),
      stop_loss: stopLoss ? parseFloat(stopLoss) : null,
      take_profit: takeProfit ? parseFloat(takeProfit) : null,
      entry_date: new Date().toISOString(),
      pnl: 0, // Simulated trade starts at 0 P&L
      platform: 'Simulated',
      instrument_type: 'Forex',
      notes: notes || `Simulated ${side} trade on ${symbol} from live chart`,
      simulation_mode: true
    };
    
    createTradeMutation.mutate(tradeData);
  };

  const calculateRR = () => {
    if (!stopLoss || !takeProfit) return 'N/A';
    const risk = Math.abs(currentPrice - parseFloat(stopLoss));
    const reward = Math.abs(parseFloat(takeProfit) - currentPrice);
    return (reward / risk).toFixed(2);
  };

  const calculatePips = (price) => {
    return Math.abs((price - currentPrice) * 10000).toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Quick Trade - {symbol}</CardTitle>
            <p className="text-sm text-slate-600 mt-1">
              Current Price: <span className="font-bold text-slate-900">{currentPrice?.toFixed(5)}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Direction */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={side === 'Long' ? 'default' : 'outline'}
                onClick={() => setSide('Long')}
                className={side === 'Long' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Long (Buy)
              </Button>
              <Button
                type="button"
                variant={side === 'Short' ? 'default' : 'outline'}
                onClick={() => setSide('Short')}
                className={side === 'Short' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                <TrendingDown className="h-4 w-4 mr-2" />
                Short (Sell)
              </Button>
            </div>

            {/* Position Size */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Position Size (Lots)
              </label>
              <Input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1.0"
                required
              />
            </div>

            {/* Stop Loss & Take Profit */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Stop Loss
                </label>
                <Input
                  type="number"
                  step="0.00001"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  placeholder={currentPrice?.toFixed(5)}
                />
                {stopLoss && (
                  <p className="text-xs text-slate-500 mt-1">
                    {calculatePips(parseFloat(stopLoss))} pips
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Take Profit
                </label>
                <Input
                  type="number"
                  step="0.00001"
                  value={takeProfit}
                  onChange={(e) => setTakeProfit(e.target.value)}
                  placeholder={currentPrice?.toFixed(5)}
                />
                {takeProfit && (
                  <p className="text-xs text-slate-500 mt-1">
                    {calculatePips(parseFloat(takeProfit))} pips
                  </p>
                )}
              </div>
            </div>

            {/* Risk/Reward */}
            {stopLoss && takeProfit && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Risk:Reward Ratio</span>
                  <span className="text-xl font-bold text-blue-600">1:{calculateRR()}</span>
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Trade Notes (Optional)
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Setup, reasoning, strategy..."
              />
            </div>

            {/* Simulation Notice */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                🎯 This is a <strong>simulated trade</strong> for practice and journaling. 
                No real money is involved.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className={side === 'Long' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                Place Simulated Trade
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}