import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, DollarSign } from 'lucide-react';

export default function ProfitTargetCalculator() {
  const [accountBalance, setAccountBalance] = useState(10000);
  const [targetProfit, setTargetProfit] = useState(1000);
  const [winRate, setWinRate] = useState(60);
  const [avgWin, setAvgWin] = useState(100);
  const [avgLoss, setAvgLoss] = useState(50);

  const darkMode = document.documentElement.classList.contains('dark');

  const calculateTrades = () => {
    const targetPercent = (targetProfit / accountBalance) * 100;
    const netPerTrade = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;
    const tradesNeeded = netPerTrade > 0 ? Math.ceil(targetProfit / netPerTrade) : 0;
    const expectedWins = Math.ceil(tradesNeeded * (winRate / 100));
    const expectedLosses = tradesNeeded - expectedWins;

    return {
      targetPercent,
      tradesNeeded,
      expectedWins,
      expectedLosses,
      netPerTrade
    };
  };

  const result = calculateTrades();

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Target className="h-5 w-5" />
          Profit Target Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Account Balance ($)</Label>
            <Input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
              className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Target Profit ($)</Label>
            <Input
              type="number"
              value={targetProfit}
              onChange={(e) => setTargetProfit(parseFloat(e.target.value) || 0)}
              className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Win Rate (%)</Label>
            <Input
              type="number"
              value={winRate}
              onChange={(e) => setWinRate(parseFloat(e.target.value) || 0)}
              className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Avg Win ($)</Label>
            <Input
              type="number"
              value={avgWin}
              onChange={(e) => setAvgWin(parseFloat(e.target.value) || 0)}
              className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Avg Loss ($)</Label>
            <Input
              type="number"
              value={avgLoss}
              onChange={(e) => setAvgLoss(parseFloat(e.target.value) || 0)}
              className={darkMode ? 'bg-slate-900 border-cyan-500/30' : ''}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className={darkMode ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'}>
            <CardContent className="p-4">
              <p className={`text-xs mb-1 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Target %</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                {result.targetPercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-purple-900/20 border-purple-500/30' : 'bg-purple-50 border-purple-200'}>
            <CardContent className="p-4">
              <p className={`text-xs mb-1 ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>Trades Needed</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                {result.tradesNeeded}
              </p>
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200'}>
            <CardContent className="p-4">
              <p className={`text-xs mb-1 ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Expected Wins</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                {result.expectedWins}
              </p>
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'}>
            <CardContent className="p-4">
              <p className={`text-xs mb-1 ${darkMode ? 'text-red-400' : 'text-red-700'}`}>Expected Losses</p>
              <p className={`text-2xl font-bold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
                {result.expectedLosses}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-100'}`}>
          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <span className="font-bold">Net Per Trade:</span> ${result.netPerTrade.toFixed(2)}
          </p>
          <p className={`text-xs mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Based on your {winRate}% win rate, you need approximately {result.tradesNeeded} trades to reach your target of ${targetProfit.toLocaleString()}.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}