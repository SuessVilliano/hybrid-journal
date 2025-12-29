import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

export default function LinkTradesToPlan({ dailyPlanId, initialLinkedTradeIds, onLinkedTradesChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [linkedTrades, setLinkedTrades] = useState(initialLinkedTradeIds || []);
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: allTrades = [], isLoading: isLoadingTrades } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-entry_date', 100),
  });

  const filteredTrades = allTrades.filter(trade => {
    const matchesSearch = searchQuery === '' ||
      trade.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.strategy?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trade.notes?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handleTradeToggle = (tradeId) => {
    const newLinkedTrades = linkedTrades.includes(tradeId)
      ? linkedTrades.filter(id => id !== tradeId)
      : [...linkedTrades, tradeId];
    setLinkedTrades(newLinkedTrades);
    onLinkedTradesChange(newLinkedTrades);
  };

  return (
    <div className={`p-4 rounded-lg border ${darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      <h4 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Link Trades to This Plan</h4>
      <p className={`text-xs mb-3 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Track which trades followed this plan to calculate your adherence score
      </p>
      <Input
        placeholder="Search trades by symbol, strategy, or notes..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className={`mb-4 ${darkMode ? 'bg-slate-800 border-slate-700 text-white' : ''}`}
      />

      {isLoadingTrades ? (
        <div className="text-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500 mx-auto" />
          <p className={`text-sm mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Loading trades...</p>
        </div>
      ) : filteredTrades.length === 0 ? (
        <p className={`text-sm text-center py-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No trades found</p>
      ) : (
        <div className="max-h-60 overflow-y-auto space-y-2">
          {filteredTrades.map(trade => (
            <div key={trade.id} className={`flex items-center justify-between p-2 rounded-md ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`trade-${trade.id}`}
                  checked={linkedTrades.includes(trade.id)}
                  onCheckedChange={() => handleTradeToggle(trade.id)}
                />
                <label htmlFor={`trade-${trade.id}`} className={`text-sm font-medium leading-none cursor-pointer ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  {trade.symbol} - {trade.side} ({format(new Date(trade.entry_date), 'MMM d, h:mm a')})
                </label>
              </div>
              <Badge className={trade.pnl >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                ${trade.pnl?.toFixed(2)}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}