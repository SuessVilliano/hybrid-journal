import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

export default function TradeList({ trades, onEdit, onDelete, selectedTrades = [], onSelectTrade, onSelectAll, bulkMode }) {
  const darkMode = document.documentElement.classList.contains('dark');
  const allSelected = trades.length > 0 && selectedTrades.length === trades.length;
  
  return (
    <div className="space-y-3">
      {bulkMode && trades.length > 0 && (
        <Card className={`p-4 ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allSelected}
              onCheckedChange={onSelectAll}
            />
            <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Select All ({trades.length} trades)
            </span>
          </div>
        </Card>
      )}
      {trades.map((trade) => (
        <Card key={trade.id} className={`p-4 hover:shadow-md transition-shadow ${
          darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Checkbox for bulk selection */}
              {bulkMode && (
                <Checkbox
                  checked={selectedTrades.includes(trade.id)}
                  onCheckedChange={(checked) => onSelectTrade(trade.id, checked)}
                />
              )}

              {/* Symbol & Direction */}
              <div className="flex items-center gap-2">
                {trade.pnl >= 0 ? (
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  </div>
                )}
                <div>
                  <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{trade.symbol}</div>
                  <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{trade.platform}</div>
                </div>
              </div>

              {/* Trade Details */}
              <div className="hidden md:flex items-center gap-6 flex-1">
                <div>
                  <div className="text-xs text-slate-500">Side</div>
                  <Badge variant={trade.side === 'Long' ? 'default' : 'secondary'}>
                    {trade.side}
                  </Badge>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Entry</div>
                  <div className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {trade.entry_price?.toFixed(5) || 'N/A'}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Exit</div>
                  <div className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {trade.exit_price?.toFixed(5) || 'Open'}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500">Date</div>
                  <div className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                    {format(new Date(trade.entry_date), 'MMM dd, yyyy')}
                  </div>
                </div>

                {trade.strategy && (
                  <div>
                    <div className="text-xs text-slate-500">Strategy</div>
                    <div className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-900'}`}>
                      {trade.strategy}
                    </div>
                  </div>
                )}
              </div>

              {/* P&L */}
              <div className="text-right">
                <div className="text-xs text-slate-500 mb-1">P&L</div>
                <div className={`text-xl font-bold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {trade.pnl >= 0 ? '+' : ''}{trade.pnl?.toFixed(2) || '0.00'}
                </div>
              </div>
            </div>

            {/* Actions */}
            {!bulkMode && (
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(trade)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(trade.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Notes Preview (Mobile) */}
          {trade.notes && (
            <div className={`mt-3 text-sm line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {trade.notes}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}