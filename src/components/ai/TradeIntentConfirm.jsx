import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp, TrendingDown, Check, X, AlertTriangle } from 'lucide-react';

/**
 * Confirmation overlay shown when the AI coach detects a trade-from-text intent.
 * Previews the parsed order (from placeTrade dry_run) and lets the user execute or cancel.
 */
export default function TradeIntentConfirm({ pending, executing, onExecute, onCancel }) {
  if (!pending) return null;
  const { parsed, error, text } = pending;
  const dark = document.documentElement.classList.contains('dark');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4">
      <div className={`rounded-xl shadow-2xl max-w-md w-full p-5 border border-cyan-500/30 ${
        dark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="font-bold">Confirm Trade</h3>
        </div>
        <p className={`text-xs mb-3 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Heard: “{text}”
        </p>

        {error ? (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        ) : !parsed ? (
          <div className={`flex items-center gap-2 text-sm ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
            <Loader2 className="h-4 w-4 animate-spin" /> Parsing order…
          </div>
        ) : (
          <div className="space-y-2">
            <div className={`flex items-center justify-between p-3 rounded-lg ${dark ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <div className="flex items-center gap-2">
                {parsed.side === 'BUY' ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                <span className="font-bold text-lg">{parsed.side}</span>
              </div>
              <div className="text-right">
                <div className="font-bold">{parsed.volume} {parsed.symbol}</div>
                <div className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {parsed.order_type || 'MARKET'}
                </div>
              </div>
            </div>
            {parsed.stop_loss != null && (
              <div className="flex justify-between text-sm">
                <span className={dark ? 'text-slate-400' : 'text-slate-500'}>Stop Loss</span>
                <span className="font-mono text-red-600">{parsed.stop_loss}</span>
              </div>
            )}
            {parsed.take_profit != null && (
              <div className="flex justify-between text-sm">
                <span className={dark ? 'text-slate-400' : 'text-slate-500'}>Take Profit</span>
                <span className="font-mono text-green-600">{parsed.take_profit}</span>
              </div>
            )}
            <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300 p-2 rounded">
              ⚠️ This sends a real order to your connected cTrader account.
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel} disabled={executing}>
            Cancel
          </Button>
          <Button
            onClick={onExecute}
            disabled={!parsed || executing || !!error}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
          >
            {executing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" /> Execute Trade
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}