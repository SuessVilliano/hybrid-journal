import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';

export default function PropFirmRulesCard({ 
  accountBalance = 0,
  todaysPnl = 0,
  onRulesChange,
  initialRules = {}
}) {
  const [maxDailyLoss, setMaxDailyLoss] = useState(initialRules.max_daily_loss || 0);
  const [maxDailyLossPercent, setMaxDailyLossPercent] = useState(initialRules.max_daily_loss_percent || 5);
  const [trailingDrawdown, setTrailingDrawdown] = useState(initialRules.trailing_drawdown_percent || 10);

  const calculateLimits = () => {
    const maxLossDollars = maxDailyLoss || (accountBalance * (maxDailyLossPercent / 100));
    const trailingDrawdownDollars = accountBalance * (trailingDrawdown / 100);
    const remainingDaily = maxLossDollars + todaysPnl; // If PnL is negative, remaining decreases
    const dailyLossPercentUsed = accountBalance > 0 ? (Math.abs(todaysPnl) / accountBalance) * 100 : 0;

    return {
      maxLossDollars,
      trailingDrawdownDollars,
      remainingDaily,
      dailyLossPercentUsed,
      isViolating: todaysPnl < -maxLossDollars
    };
  };

  const limits = calculateLimits();
  const darkMode = document.documentElement.classList.contains('dark');

  React.useEffect(() => {
    if (onRulesChange) {
      onRulesChange({
        max_daily_loss: maxDailyLoss,
        max_daily_loss_percent: maxDailyLossPercent,
        trailing_drawdown_percent: trailingDrawdown
      });
    }
  }, [maxDailyLoss, maxDailyLossPercent, trailingDrawdown]);

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Shield className="h-5 w-5" />
          Prop Firm Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Max Daily Loss ($)</Label>
            <Input
              type="number"
              value={maxDailyLoss}
              onChange={(e) => setMaxDailyLoss(parseFloat(e.target.value) || 0)}
              placeholder="500"
            />
          </div>

          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Max Daily Loss (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={maxDailyLossPercent}
              onChange={(e) => setMaxDailyLossPercent(parseFloat(e.target.value) || 5)}
              placeholder="5"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Trailing Drawdown (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={trailingDrawdown}
              onChange={(e) => setTrailingDrawdown(parseFloat(e.target.value) || 10)}
              placeholder="10"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className={`p-4 rounded-lg border ${
            limits.isViolating 
              ? darkMode ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'
              : darkMode ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              {limits.isViolating ? (
                <AlertTriangle className={darkMode ? 'text-red-400' : 'text-red-600'} />
              ) : (
                <CheckCircle className={darkMode ? 'text-green-400' : 'text-green-600'} />
              )}
              <span className={`font-medium ${
                limits.isViolating 
                  ? darkMode ? 'text-red-400' : 'text-red-700'
                  : darkMode ? 'text-green-400' : 'text-green-700'
              }`}>
                {limits.isViolating ? 'Daily Loss Limit Violated!' : 'Within Daily Limits'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Today's P&L</div>
                <div className={`font-bold ${todaysPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${todaysPnl.toFixed(2)}
                </div>
              </div>
              <div>
                <div className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Remaining</div>
                <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  ${limits.remainingDaily.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Max Daily Loss</div>
              <div className={`text-lg font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                ${limits.maxLossDollars.toFixed(2)}
              </div>
            </div>

            <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Trailing DD</div>
              <div className={`text-lg font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                ${limits.trailingDrawdownDollars.toFixed(2)}
              </div>
            </div>
          </div>

          <div className={`text-xs p-2 rounded ${darkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'}`}>
            💡 Used {limits.dailyLossPercentUsed.toFixed(2)}% of daily loss limit
          </div>
        </div>
      </CardContent>
    </Card>
  );
}