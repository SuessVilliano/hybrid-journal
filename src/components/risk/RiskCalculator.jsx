import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Calculator, TrendingUp, Shield } from 'lucide-react';

export default function RiskCalculator({ 
  accountBalance = 0, 
  onCalculationComplete,
  initialValues = {}
}) {
  const [instrumentType, setInstrumentType] = useState(initialValues.instrument_type_planned || 'Futures');
  const [riskPercent, setRiskPercent] = useState(initialValues.max_risk_percent_per_trade || 1);
  const [entryPrice, setEntryPrice] = useState(initialValues.target_entry_price || '');
  const [stopLoss, setStopLoss] = useState(initialValues.target_stop_loss || '');
  const [contractSize, setContractSize] = useState(1);
  const [pipValue, setPipValue] = useState(10); // Default for futures
  const [calculated, setCalculated] = useState(null);

  useEffect(() => {
    // Update pip values based on instrument type
    if (instrumentType === 'Futures') {
      setPipValue(5); // $5 per tick for NQ
      setContractSize(1);
    } else if (instrumentType === 'Forex') {
      setPipValue(10); // $10 per pip for standard lot
      setContractSize(1);
    } else if (instrumentType === 'Crypto') {
      setPipValue(1);
      setContractSize(0.01);
    }
  }, [instrumentType]);

  useEffect(() => {
    if (accountBalance && entryPrice && stopLoss && riskPercent) {
      calculatePosition();
    }
  }, [accountBalance, entryPrice, stopLoss, riskPercent, instrumentType, pipValue, contractSize]);

  const calculatePosition = () => {
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const maxRiskDollars = accountBalance * (riskPercent / 100);

    let riskPerUnit, positionSize, monetaryRisk;

    if (instrumentType === 'Futures') {
      // For futures: risk per contract = (Entry - SL) * point value
      const pointsRisk = Math.abs(entry - sl);
      riskPerUnit = pointsRisk * pipValue;
      positionSize = Math.floor(maxRiskDollars / riskPerUnit);
      monetaryRisk = positionSize * riskPerUnit;
    } else if (instrumentType === 'Forex') {
      // For forex: risk in pips
      const pipsRisk = Math.abs(entry - sl) * 10000; // Convert to pips
      riskPerUnit = pipsRisk * pipValue * contractSize;
      positionSize = Math.floor(maxRiskDollars / riskPerUnit);
      monetaryRisk = positionSize * riskPerUnit;
    } else if (instrumentType === 'Crypto') {
      // For crypto: risk per unit
      const priceRisk = Math.abs(entry - sl);
      riskPerUnit = priceRisk;
      positionSize = maxRiskDollars / riskPerUnit;
      monetaryRisk = positionSize * riskPerUnit;
    }

    const result = {
      positionSize: positionSize || 0,
      monetaryRisk: monetaryRisk || 0,
      riskPerUnit: riskPerUnit || 0,
      maxRiskDollars,
      riskRewardRatio: 0
    };

    setCalculated(result);
    if (onCalculationComplete) {
      onCalculationComplete(result);
    }
  };

  const darkMode = document.documentElement.classList.contains('dark');

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Calculator className="h-5 w-5" />
          Position Size Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Instrument Type</Label>
            <Select value={instrumentType} onValueChange={setInstrumentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Futures">Futures</SelectItem>
                <SelectItem value="Forex">Forex</SelectItem>
                <SelectItem value="Crypto">Crypto</SelectItem>
                <SelectItem value="Stocks">Stocks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Risk Per Trade (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 1)}
              placeholder="1"
            />
          </div>

          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Entry Price</Label>
            <Input
              type="number"
              step="0.01"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="25883.25"
            />
          </div>

          <div className="space-y-2">
            <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Stop Loss</Label>
            <Input
              type="number"
              step="0.01"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="25865.32"
            />
          </div>
        </div>

        {calculated && (
          <div className="mt-6 space-y-3">
            <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-600/10 border border-cyan-500/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                  Suggested Position Size
                </span>
                <TrendingUp className={`h-4 w-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`} />
              </div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {calculated.positionSize.toFixed(instrumentType === 'Crypto' ? 4 : 0)}{' '}
                {instrumentType === 'Futures' ? 'contracts' : instrumentType === 'Forex' ? 'lots' : 'units'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Max Risk ($)</div>
                <div className={`text-lg font-bold ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                  ${calculated.maxRiskDollars.toFixed(2)}
                </div>
              </div>

              <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Actual Risk ($)</div>
                <div className={`text-lg font-bold ${darkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                  ${calculated.monetaryRisk.toFixed(2)}
                </div>
              </div>
            </div>

            {accountBalance > 0 && (
              <div className={`flex items-start gap-2 p-3 rounded-lg ${darkMode ? 'bg-blue-500/10' : 'bg-blue-50'} border ${darkMode ? 'border-blue-500/30' : 'border-blue-200'}`}>
                <Shield className={`h-4 w-4 mt-0.5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <div className="flex-1">
                  <div className={`text-sm font-medium ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                    Account Balance: ${accountBalance.toFixed(2)}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                    Risking {riskPercent}% = ${calculated.maxRiskDollars.toFixed(2)} max loss
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}