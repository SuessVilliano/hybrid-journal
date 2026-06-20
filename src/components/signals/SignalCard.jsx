import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, X, Check, Eye, Zap, Brain, Copy, Loader2 } from 'lucide-react';
import { getRelativeTime } from '@/components/utils/timezoneHelper';
import { toast } from 'sonner';
import { calcPipsOrPoints } from './signalMath';

// Infer default timeframe by provider when not explicitly set
function inferTimeframe(signal) {
  if (signal.timeframe) return signal.timeframe;
  const provider = (signal.provider || '').toLowerCase();
  if (provider.includes('hybrid')) return '10m';
  if (provider.includes('paradox')) return '30m';
  if (provider.includes('solaris')) return '5m';
  return null;
}

function formatPrice(price) {
  if (price === null || price === undefined || price === '') return 'N/A';
  const n = Number(price);
  if (isNaN(n)) return 'N/A';
  if (n >= 1000) return n.toFixed(1);
  if (n >= 10)   return n.toFixed(2);
  if (n >= 1)    return n.toFixed(4);
  return n.toFixed(5);
}

// Detect browser timezone abbreviation (e.g. EDT, CDT, PDT)
function formatLocalTime(utcTimestamp) {
  if (!utcTimestamp) return '';
  // Ensure the string is treated as UTC by appending Z if missing
  const normalized = utcTimestamp.endsWith('Z') || utcTimestamp.includes('+') ? utcTimestamp : utcTimestamp + 'Z';
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZoneName: 'short'
  });
}

export default function SignalCard({ 
  signal, 
  user,
  onAnalyze, 
  onRoute, 
  onForceExecute, 
  onMarkViewed, 
  onIgnore,
  isRouting,
  isUpdating
}) {
  const darkMode = document.documentElement.classList.contains('dark');

  const handleAnalyze = (e) => {
    e.stopPropagation();
    onAnalyze(signal);
  };

  const handleRoute = (e) => {
    e.stopPropagation();
    onRoute(signal.id, false);
  };

  const handleForceExecute = (e) => {
    e.stopPropagation();
    onForceExecute(signal.id);
  };

  const handleMarkViewed = (e) => {
    e.stopPropagation();
    onMarkViewed(signal.id);
  };

  const handleIgnore = (e) => {
    e.stopPropagation();
    onIgnore(signal.id);
  };

  const copyToClipboard = (e, value, label) => {
    e.stopPropagation();
    if (!value && value !== 0) return;
    navigator.clipboard.writeText(value.toString());
    toast.success(`${label} copied!`);
  };

  const getCardStyles = () => {
    const base = darkMode ? 'bg-slate-950/80' : 'bg-white';
    switch (signal.status) {
      case 'new':
        return `${base} ${darkMode ? 'border-cyan-500/40' : 'border-cyan-500/50'} ring-2 ring-cyan-500`;
      case 'viewed':
        return `${base} ${darkMode ? 'border-slate-600/40 opacity-75' : 'border-slate-300 opacity-80'}`;
      case 'executed':
        return `${base} ${darkMode ? 'border-green-500/40' : 'border-green-300'} ring-1 ring-green-500/50`;
      case 'full_target':
        return `${base} ${darkMode ? 'border-green-500/60' : 'border-green-400'} ring-2 ring-green-500/60`;
      case 'tp1_hit':
      case 'tp2_hit':
        return `${base} ${darkMode ? 'border-yellow-500/50' : 'border-yellow-400'} ring-1 ring-yellow-500/50`;
      case 'stopped_out':
        return `${base} ${darkMode ? 'border-red-500/50' : 'border-red-300'} ring-1 ring-red-500/40`;
      case 'ignored':
        return `${base} ${darkMode ? 'border-slate-700/40 opacity-50' : 'border-slate-200 opacity-60'}`;
      default:
        return `${base} ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'}`;
    }
  };

  const getStatusBadge = () => {
    switch (signal.status) {
      case 'new':
        return <Badge className="bg-slate-500 animate-pulse">NEW</Badge>;
      case 'viewed':
        return <Badge variant="outline" className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"><Eye className="h-3 w-3 mr-1" />VIEWED</Badge>;
      case 'executed':
        return <Badge className="bg-green-600"><Check className="h-3 w-3 mr-1" />EXECUTED</Badge>;
      case 'full_target':
        return <Badge className="bg-green-500 text-white">🎯 FULL TARGET</Badge>;
      case 'tp1_hit':
        return <Badge className="bg-yellow-500 text-white">TP1 HIT</Badge>;
      case 'tp2_hit':
        return <Badge className="bg-orange-500 text-white">TP2 HIT</Badge>;
      case 'stopped_out':
        return <Badge className="bg-red-600 text-white">STOPPED OUT</Badge>;
      case 'ignored':
        return <Badge variant="outline" className="bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"><X className="h-3 w-3 mr-1" />IGNORED</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card
      className={`${getCardStyles()} transition-all duration-300 hover:shadow-lg`}
    >
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              {signal.action === 'BUY' ? (
                <TrendingUp className="h-6 w-6 text-green-500" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-500" />
              )}
              <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {signal.symbol}
              </h3>
              <Badge className={signal.action === 'BUY' ? 'bg-green-500' : 'bg-red-500'}>
                {signal.action}
              </Badge>
              <Badge variant="outline">{signal.provider}</Badge>
              {inferTimeframe(signal) && (
                <Badge className={`${darkMode ? 'bg-purple-900/60 text-purple-300 border-purple-500/40' : 'bg-purple-100 text-purple-700 border-purple-300'} border text-xs font-mono`}>
                  {inferTimeframe(signal)}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              <div>
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Entry Price</div>
                <div className="flex items-center gap-2">
                  <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {formatPrice(signal.price)}
                  </div>
                  {signal.price && (
                    <button
                      onClick={(e) => copyToClipboard(e, signal.price, 'Entry')}
                      className={`p-1 rounded hover:bg-cyan-500/20 transition ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
              {signal.stop_loss > 0 && (
                <div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Stop Loss</div>
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-red-500">
                      {formatPrice(signal.stop_loss)}
                    </div>
                    <button
                      onClick={(e) => copyToClipboard(e, signal.stop_loss, 'Stop Loss')}
                      className="p-1 rounded hover:bg-red-500/20 transition text-red-500"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Multiple Take Profits with individual copy buttons */}
            {signal.take_profits && signal.take_profits.length > 0 && (
              <div className="mb-3">
                <div className={`text-xs mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Take Profits</div>
                <div className="flex flex-wrap gap-2">
                  {signal.take_profits.map((tp, idx) => (
                    <div key={idx} className={`px-3 py-1.5 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'} flex items-center gap-2`}>
                      <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                        TP{idx + 1}:
                      </span>
                      <span className="ml-1 font-bold text-green-500">
                        {formatPrice(tp)}
                      </span>
                      <button
                        onClick={(e) => copyToClipboard(e, tp, `TP${idx + 1}`)}
                        className="p-1 rounded hover:bg-green-500/20 transition text-green-500"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback to single take_profit */}
            {(!signal.take_profits || signal.take_profits.length === 0) && signal.take_profit > 0 && (
              <div className="mb-3">
                <div className={`text-xs mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Take Profit</div>
                <div className={`px-3 py-1.5 rounded-lg inline-flex items-center gap-2 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                  <span className="font-bold text-green-500">
                    {formatPrice(signal.take_profit)}
                  </span>
                  <button
                    onClick={(e) => copyToClipboard(e, signal.take_profit, 'Take Profit')}
                    className="p-1 rounded hover:bg-green-500/20 transition text-green-500"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-1">
                <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>Opened:</span>
                <span className={`font-medium ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  {formatLocalTime(signal.created_date)}
                </span>
              </div>
              {signal.resolved_at && (
                <div className="flex items-center gap-1">
                  <span className={darkMode ? 'text-slate-500' : 'text-slate-400'}>Hit:</span>
                  <span className={`font-medium ${
                    signal.status === 'stopped_out' ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {formatLocalTime(signal.resolved_at)}
                  </span>
                </div>
              )}
              {signal.strategy && (
                <span className={darkMode ? 'text-cyan-400' : 'text-cyan-600'}>
                  Strategy: {signal.strategy}
                </span>
              )}
            </div>

            {signal.notes && (
              <p className={`mt-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {signal.notes}
              </p>
            )}
          </div>

          <div className="flex flex-wrap md:flex-col gap-2">
            {signal.status === 'new' && (
              <>
                <Button
                  onClick={handleAnalyze}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 flex-1 md:flex-none transition-all active:scale-95"
                  size="sm"
                  type="button"
                >
                  <Brain className="h-4 w-4 mr-1" />
                  <span className="text-xs">Analyze</span>
                </Button>
                <Button
                  onClick={handleRoute}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 flex-1 md:flex-none transition-all active:scale-95"
                  size="sm"
                  type="button"
                  disabled={isRouting || isUpdating}
                >
                  {isRouting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-1" />
                  )}
                  <span className="text-xs">
                    {isRouting ? 'Processing...' : 'AI Route'}
                  </span>
                </Button>
                <Button
                  onClick={handleForceExecute}
                  className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none transition-all active:scale-95"
                  size="sm"
                  type="button"
                  disabled={isRouting || isUpdating}
                >
                  {isRouting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  <span className="text-xs">
                    {isRouting ? 'Executing...' : 'Execute'}
                  </span>
                </Button>
                <Button
                  onClick={handleMarkViewed}
                  variant="outline"
                  size="sm"
                  type="button"
                  className="flex-1 md:flex-none transition-all hover:bg-cyan-500/10 active:scale-95"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4 mr-1" />
                  )}
                  <span className="text-xs">
                    {isUpdating ? 'Updating...' : 'Viewed'}
                  </span>
                </Button>
                <Button
                  onClick={handleIgnore}
                  variant="outline"
                  size="sm"
                  type="button"
                  className="flex-1 md:flex-none transition-all hover:bg-red-500/10 active:scale-95"
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 mr-1" />
                  )}
                  <span className="text-xs">
                    {isUpdating ? 'Updating...' : 'Ignore'}
                  </span>
                </Button>
              </>
            )}
            {signal.status === 'viewed' && (
              <>
                <Button
                  onClick={handleRoute}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 flex-1 md:flex-none transition-all active:scale-95"
                  size="sm"
                  type="button"
                  disabled={isRouting || isUpdating}
                >
                  {isRouting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4 mr-1" />
                  )}
                  <span className="text-xs">
                    {isRouting ? 'Processing...' : 'AI Route'}
                  </span>
                </Button>
                <Button
                  onClick={handleForceExecute}
                  className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none transition-all active:scale-95"
                  size="sm"
                  type="button"
                  disabled={isRouting || isUpdating}
                >
                  {isRouting ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1" />
                  )}
                  <span className="text-xs">
                    {isRouting ? 'Executing...' : 'Execute'}
                  </span>
                </Button>
              </>
            )}
            {['executed', 'full_target', 'tp1_hit', 'tp2_hit', 'stopped_out', 'ignored'].includes(signal.status) && (
              <div className="flex flex-col items-center gap-2 py-2">
                {getStatusBadge()}
                {(() => {
                  const result = calcPipsOrPoints(signal);
                  if (!result) return null;
                  const isPos = result.value >= 0;
                  return (
                    <div className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${
                      isPos
                        ? darkMode ? 'bg-green-900/30 border-green-500/40 text-green-400' : 'bg-green-50 border-green-300 text-green-700'
                        : darkMode ? 'bg-red-900/30 border-red-500/40 text-red-400' : 'bg-red-50 border-red-300 text-red-700'
                    }`}>
                      {result.formatted}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}