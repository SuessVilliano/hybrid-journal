import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Sparkles, TrendingUp } from 'lucide-react';
import { calculatePositionSize, calculateDynamicRiskLevels, getMarketVolatility } from './RiskEngine';

export default function PositionSizeCalculator({ accountBalance = 10000 }) {
  const [symbol, setSymbol] = useState('EURUSD');
  const [side, setSide] = useState('Long');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [riskPercent, setRiskPercent] = useState(2);
  const [result, setResult] = useState(null);
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const calculate = () => {
    if (!entryPrice || !stopLoss) return;
    
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    
    const positionSize = calculatePositionSize(accountBalance, riskPercent, entry, sl);
    setResult(positionSize);
  };

  const getAISuggestion = async () => {
    if (!symbol || !entryPrice) return;
    
    setLoadingAI(true);
    try {
      const marketData = await getMarketVolatility(symbol);
      const trade = {
        symbol,
        side,
        entry_price: parseFloat(entryPrice)
      };
      
      const suggestion = await calculateDynamicRiskLevels(trade, marketData);
      setAiSuggestion(suggestion);
      
      if (suggestion) {
        setStopLoss(suggestion.stopLoss.toFixed(5));
        setRiskPercent(suggestion.positionSize);
      }
    } catch (error) {
      console.error('AI suggestion failed:', error);
    } finally {
      setLoadingAI(false);
    }
  };

  useEffect(() => {
    calculate();
  }, [entryPrice, stopLoss, riskPercent]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          AI-Powered Position Size Calculator
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Symbol</label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="EURUSD"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Side</label>
            <Select value={side} onValueChange={setSide}>
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Entry Price</label>
            <Input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="1.0850"
            />
          </div>
          <div>
            <label className="text-sm text-slate-600 mb-1 block">Stop Loss</label>
            <Input
              type="number"
              step="any"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="1.0800"
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-600 mb-1 block">
            Risk Per Trade: {riskPercent}%
          </label>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.5"
            value={riskPercent}
            onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>

        <Button 
          onClick={getAISuggestion} 
          disabled={loadingAI || !symbol || !entryPrice}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {loadingAI ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Get AI Suggestion
            </>
          )}
        </Button>

        {aiSuggestion && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-2">
            <div className="font-medium text-purple-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Recommendation
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-600">Stop Loss:</span>
                <span className="font-bold text-slate-900 ml-2">
                  {aiSuggestion.stopLoss.toFixed(5)}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Take Profit:</span>
                <span className="font-bold text-slate-900 ml-2">
                  {aiSuggestion.takeProfit.toFixed(5)}
                </span>
              </div>
              <div>
                <span className="text-slate-600">R:R Ratio:</span>
                <span className="font-bold text-green-600 ml-2">
                  1:{aiSuggestion.riskReward.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Confidence:</span>
                <span className="font-bold text-blue-600 ml-2">
                  {aiSuggestion.confidence}%
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-600 italic mt-2">
              {aiSuggestion.reasoning}
            </div>
          </div>
        )}

        {result && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="font-medium text-blue-900 mb-3">Position Size</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Shares/Lots:</span>
                <span className="font-bold text-slate-900">{result.shares}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Position Value:</span>
                <span className="font-bold text-slate-900">${result.value.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Risk Amount:</span>
                <span className="font-bold text-red-600">${result.riskAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">% of Portfolio:</span>
                <span className="font-bold text-slate-900">
                  {((result.value / accountBalance) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500 text-center">
          Account Balance: ${accountBalance.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}