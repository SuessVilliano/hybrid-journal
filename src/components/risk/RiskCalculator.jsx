import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Calculator, TrendingUp, Shield } from 'lucide-react';

// Dollar value of a 1.0-point move per contract (exchange contract specs)
const FUTURES_SPECS = {
  NQ: { label: 'NQ — Nasdaq 100', pointValue: 20 },
  MNQ: { label: 'MNQ — Micro Nasdaq', pointValue: 2 },
  ES: { label: 'ES — S&P 500', pointValue: 50 },
  MES: { label: 'MES — Micro S&P', pointValue: 5 },
  YM: { label: 'YM — Dow', pointValue: 5 },
  MYM: { label: 'MYM — Micro Dow', pointValue: 0.5 },
  RTY: { label: 'RTY — Russell 2000', pointValue: 50 },
  M2K: { label: 'M2K — Micro Russell', pointValue: 5 },
  GC: { label: 'GC — Gold', pointValue: 100 },
  MGC: { label: 'MGC — Micro Gold', pointValue: 10 },
  CL: { label: 'CL — Crude Oil', pointValue: 1000 },
  MCL: { label: 'MCL — Micro Crude', pointValue: 100 }
};

// Approximate $/pip per standard lot for JPY-quoted pairs (¥1000/pip converted
// at USD/JPY ≈ 143; the exact value varies with the USD/JPY rate)
const JPY_PIP_VALUE_PER_LOT = 7;

export default function RiskCalculator({
  accountBalance = 0,
  onCalculationComplete,
  initialValues = {}
}) {
  const [instrumentType, setInstrumentType] = useState(initialValues.instrument_type_planned || 'Futures');
  const [riskPercent, setRiskPercent] = useState(initialValues.max_risk_percent_per_trade || 1);
  const [entryPrice, setEntryPrice] = useState(initialValues.target_entry_price || '');
  const [stopLoss, setStopLoss] = useState(initialValues.target_stop_loss || '');
  const [futuresSymbol, setFuturesSymbol] = useState('NQ');
  // Forex pip size: 0.0001 for standard pairs, 0.01 for JPY-quoted pairs
  const [pipSize, setPipSize] = useState('0.0001');
  const [calculated, setCalculated] = useState(null);

  useEffect(() => {
    if (accountBalance && entryPrice && stopLoss && riskPercent) {
      calculatePosition();
    }
  }, [accountBalance, entryPrice, stopLoss, riskPercent, instrumentType, futuresSymbol, pipSize]);

  const calculatePosition = () => {
    const entry = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const maxRiskDollars = accountBalance * (riskPercent / 100);
    const priceRisk = Math.abs(entry - sl);

    if (!Number.isFinite(priceRisk) || priceRisk <= 0) {
      setCalculated(null);
      return;
    }

    let riskPerUnit, positionSize, monetaryRisk;

    if (instrumentType === 'Futures') {
      // Risk per contract = points at risk * dollar value per point
      const pointValue = FUTURES_SPECS[futuresSymbol]?.pointValue || 20;
      riskPerUnit = priceRisk * pointValue;
      positionSize = Math.floor(maxRiskDollars / riskPerUnit);
      monetaryRisk = positionSize * riskPerUnit;
    } else if (instrumentType === 'Forex') {
      // Pips at risk = price distance / pip size (0.0001 standard, 0.01 JPY pairs).
      // $/pip per standard lot: $10 for USD-quoted pairs; for JPY pairs the
      // exact value varies with USD/JPY, approximated here at $7/pip.
      const pip = parseFloat(pipSize) || 0.0001;
      const pipValuePerLot = pip === 0.01 ? JPY_PIP_VALUE_PER_LOT : 10;
      const pipsRisk = priceRisk / pip;
      riskPerUnit = pipsRisk * pipValuePerLot;
      positionSize = Math.floor((maxRiskDollars / riskPerUnit) * 100) / 100;
      monetaryRisk = positionSize * riskPerUnit;
    } else if (instrumentType === 'Crypto') {
      riskPerUnit = priceRisk;
      positionSize = maxRiskDollars / riskPerUnit;
      monetaryRisk = positionSize * riskPerUnit;
    } else if (instrumentType === 'Stocks') {
      riskPerUnit = priceRisk;
      positionSize = Math.floor(maxRiskDollars / riskPerUnit);
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

          {instrumentType === 'Futures' && (
            <div className="space-y-2">
              <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Contract</Label>
              <Select value={futuresSymbol} onValueChange={setFuturesSymbol}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FUTURES_SPECS).map(([symbol, spec]) => (
                    <SelectItem key={symbol} value={symbol}>
                      {spec.label} (${spec.pointValue}/pt)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {instrumentType === 'Forex' && (
            <div className="space-y-2">
              <Label className={darkMode ? 'text-slate-300' : 'text-slate-700'}>Pip Size</Label>
              <Select value={pipSize} onValueChange={setPipSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.0001">0.0001 — Standard pairs</SelectItem>
                  <SelectItem value="0.01">0.01 — JPY pairs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

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
                {calculated.positionSize.toFixed(instrumentType === 'Crypto' ? 4 : instrumentType === 'Forex' ? 2 : 0)}{' '}
                {instrumentType === 'Futures' ? 'contracts' : instrumentType === 'Forex' ? 'lots' : instrumentType === 'Stocks' ? 'shares' : 'units'}
              </div>
              {instrumentType === 'Forex' && (
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {pipSize === '0.01'
                    ? `JPY pair: pip = 0.01, pip value approximated at $${JPY_PIP_VALUE_PER_LOT}/pip per standard lot (exact value varies with the USD/JPY rate).`
                    : 'Standard pair: pip = 0.0001, assumes a USD-quoted pair ($10/pip per standard lot).'}
                </p>
              )}
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