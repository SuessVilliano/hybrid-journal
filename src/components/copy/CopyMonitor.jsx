import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';

export default function CopyMonitor({ copyParamsId }) {
  const [copiedTrades, setCopiedTrades] = useState([]);
  const [stats, setStats] = useState({ pending: 0, executed: 0, failed: 0 });

  useEffect(() => {
    loadCopiedTrades();
    const interval = setInterval(loadCopiedTrades, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [copyParamsId]);

  const loadCopiedTrades = async () => {
    const trades = await base44.entities.CopiedTrade.filter({
      copy_params_id: copyParamsId
    });
    
    setCopiedTrades(trades.slice(0, 20)); // Last 20
    
    setStats({
      pending: trades.filter(t => t.copy_status === 'pending').length,
      executed: trades.filter(t => t.copy_status === 'executed').length,
      failed: trades.filter(t => t.copy_status === 'failed').length
    });
  };

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    executed: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    partial: { icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    failed: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
    rejected: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10' }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Executed</p>
                <p className="text-2xl font-bold text-green-500">{stats.executed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Failed</p>
                <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Copied Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {copiedTrades.length === 0 ? (
              <p className="text-center text-slate-500 py-8">No copied trades yet</p>
            ) : (
              copiedTrades.map(trade => {
                const config = statusConfig[trade.copy_status] || statusConfig.pending;
                const Icon = config.icon;
                
                return (
                  <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${config.bg}`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{trade.symbol}</span>
                          <Badge variant="outline" className="text-xs">
                            {trade.side}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {trade.copied_quantity} lots @ {trade.copied_entry_price?.toFixed(5) || 'pending'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {trade.slippage_pips !== undefined && (
                        <p className="text-xs text-slate-500">
                          Slippage: {trade.slippage_pips.toFixed(1)} pips
                        </p>
                      )}
                      {trade.execution_time_ms && (
                        <p className="text-xs text-slate-500">
                          {trade.execution_time_ms}ms
                        </p>
                      )}
                      {trade.error_message && (
                        <p className="text-xs text-red-500">{trade.error_message}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}