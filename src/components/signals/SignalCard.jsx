import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, X, Check, Eye, Zap, Brain, Copy, Loader2 } from 'lucide-react';
import { formatInTimezone, getRelativeTime } from '@/components/utils/timezoneHelper';
import { toast } from 'sonner';

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

  // Determine card styling based on status
  const getCardStyles = () => {
    const base = darkMode ? 'bg-slate-950/80' : 'bg-white';
    switch (signal.status) {
      case 'new':
        return `${base} ${darkMode ? 'border-cyan-500/40' : 'border-cyan-500/50'} ring-2 ring-cyan-500`;
      case 'viewed':
        return `${base} ${darkMode ? 'border-slate-600/40 opacity-75' : 'border-slate-300 opacity-80'}`;
      case 'executed':
        return `${base} ${darkMode ? 'border-green-500/40' : 'border-green-300'} ring-1 ring-green-500/50`;
      case 'ignored':
        return `${base} ${darkMode ? 'border-slate-700/40 opacity-50' : 'border-slate-200 opacity-60'}`;
      default:
        return `${base} ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'}`;
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
              {signal.status === 'new' && (
                <Badge className="bg-cyan-500 animate-pulse">NEW</Badge>
              )}
              {signal.status === 'viewed' && (
                <Badge variant="outline" className="bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  <Eye className="h-3 w-3 mr-1" />
                  VIEWED
                </Badge>
              )}
              {signal.status === 'executed' && (
                <Badge className="bg-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  EXECUTED
                </Badge>
              )}
              {signal.status === 'ignored' && (
                <Badge variant="outline" className="bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500">
                  <X className="h-3 w-3 mr-1" />
                  IGNORED
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
              <div>
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'} mb-1`}>Entry Price</div>
                <div className="flex items-center gap-2">
                  <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    ${signal.price?.toFixed(2) || 'N/A'}
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
                      ${signal.stop_loss.toFixed(2)}
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
              {signal.timeframe && (
                <div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Timeframe</div>
                  <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {signal.timeframe}
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
                        ${tp.toFixed(2)}
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
                    ${signal.take_profit.toFixed(2)}
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
              <div className="flex items-center gap-2">
                <span className={`font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  {getRelativeTime(signal.created_date)}
                </span>
                <span className={darkMode ? 'text-slate-600' : 'text-slate-400'}>•</span>
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                  {formatInTimezone(signal.created_date, user?.timezone || 'America/New_York')}
                </span>
              </div>
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
            {signal.status === 'executed' && (
              <div className="flex flex-col items-center gap-2 py-2">
                <Badge className="bg-green-500 px-4 py-1">
                  <Check className="h-4 w-4 mr-1" />
                  Executed
                </Badge>
                {signal.executed_at && (
                  <span className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    {new Date(signal.executed_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}
            {signal.status === 'ignored' && (
              <div className="flex flex-col items-center gap-2 py-2">
                <Badge variant="outline" className="px-4 py-1 text-slate-400">
                  <X className="h-4 w-4 mr-1" />
                  Ignored
                </Badge>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}