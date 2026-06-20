import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, BarChart2, Calendar } from 'lucide-react';
import { aggregateSignals, filterByPeriod } from './signalMath';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
];

export default function SignalPerformancePanel({ signals, darkMode }) {
  const [period, setPeriod] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const resolved = (signals || []).filter(s =>
    ['tp1_hit', 'tp2_hit', 'tp3_hit', 'full_target', 'stopped_out'].includes(s?.status)
  );

  const periodSignals = filterByPeriod(resolved, period, { from: customFrom, to: customTo });
  const stats = aggregateSignals(periodSignals);

  // Per-symbol breakdown
  const bySymbol = {};
  periodSignals.forEach(s => {
    if (!bySymbol[s.symbol]) bySymbol[s.symbol] = [];
    bySymbol[s.symbol].push(s);
  });
  const symbolStats = Object.entries(bySymbol)
    .map(([sym, sigs]) => ({ symbol: sym, ...aggregateSignals(sigs) }))
    .sort((a, b) => b.net - a.net);

  const card = `${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`;
  const labelCls = `text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <Card className={card}>
      <CardHeader className="pb-3">
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <BarChart2 className="h-5 w-5" />
          Points &amp; Pips Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Period tabs */}
        <div className={`flex flex-wrap gap-1 p-1 rounded-xl border ${darkMode ? 'bg-slate-900 border-cyan-500/20' : 'bg-slate-50 border-slate-200'}`}>
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === p.key
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow'
                  : darkMode ? 'text-slate-400 hover:text-cyan-400' : 'text-slate-600 hover:text-cyan-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom date range */}
        {period === 'custom' && (
          <div className="flex gap-3 items-center flex-wrap">
            <Calendar className={`h-4 w-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
            />
            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>to</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className={`text-xs px-2 py-1.5 rounded-lg border ${darkMode ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900'}`}
            />
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
            <div className={labelCls}>Caught ({stats.unit})</div>
            <div className="text-lg font-bold text-green-500">+{stats.gained.toFixed(1)}</div>
            <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{stats.winCount} wins</div>
          </div>
          <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
            <div className={labelCls}>Lost ({stats.unit})</div>
            <div className="text-lg font-bold text-red-500">-{stats.lost.toFixed(1)}</div>
            <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{stats.lossCount} losses</div>
          </div>
          <div className={`p-3 rounded-xl border ${
            stats.net >= 0
              ? darkMode ? 'bg-slate-900/60 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'
              : darkMode ? 'bg-slate-900/60 border-orange-500/20' : 'bg-orange-50 border-orange-200'
          }`}>
            <div className={labelCls}>Net ({stats.unit})</div>
            <div className={`text-lg font-bold ${stats.net >= 0 ? 'text-cyan-500' : 'text-orange-500'}`}>
              {stats.net >= 0 ? '+' : ''}{stats.net.toFixed(1)}
            </div>
            <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{periodSignals.length} resolved</div>
          </div>
          <div className={`p-3 rounded-xl border ${darkMode ? 'bg-slate-900/60 border-purple-500/20' : 'bg-purple-50 border-purple-200'}`}>
            <div className={labelCls}>Avg/Trade</div>
            <div className="text-lg font-bold text-purple-500">
              {periodSignals.length > 0 ? (stats.net / periodSignals.length).toFixed(1) : '—'}
            </div>
            <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{stats.unit}/trade</div>
          </div>
        </div>

        {/* Per-symbol breakdown */}
        {symbolStats.length > 0 && (
          <div>
            <div className={`text-xs font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>By Symbol</div>
            <div className="space-y-1.5">
              {symbolStats.map(s => (
                <div key={s.symbol} className={`flex items-center justify-between px-3 py-2 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                  <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{s.symbol}</span>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-green-500">+{s.gained.toFixed(1)}</span>
                    <span className="text-red-500">-{s.lost.toFixed(1)}</span>
                    <span className={`font-bold ${s.net >= 0 ? 'text-cyan-500' : 'text-orange-500'}`}>
                      {s.net >= 0 ? '+' : ''}{s.net.toFixed(1)} {s.unit}
                    </span>
                    <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>
                      {s.winCount}W / {s.lossCount}L
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {periodSignals.length === 0 && (
          <p className={`text-sm text-center py-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            No resolved signals in this period
          </p>
        )}
      </CardContent>
    </Card>
  );
}