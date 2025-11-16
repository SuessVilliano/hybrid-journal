import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Settings, Trash2, CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';
import { syncBrokerTrades } from './brokerAPIHelper';

export default function BrokerConnectionCard({ connection, onEdit, onDelete, onSync }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await onSync(connection);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = () => {
    switch (connection.status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = () => {
    const styles = {
      connected: 'bg-green-100 text-green-800',
      disconnected: 'bg-slate-100 text-slate-800',
      error: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };
    return (
      <Badge className={styles[connection.status]}>
        {connection.status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <CardTitle className="text-lg">{connection.broker_name}</CardTitle>
            <p className="text-sm text-slate-600">Account: {connection.account_number}</p>
          </div>
        </div>
        {getStatusBadge()}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Account Info */}
          {connection.account_balance !== undefined && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
              <div>
                <div className="text-xs text-slate-600">Balance</div>
                <div className="text-lg font-bold text-slate-900">
                  ${connection.account_balance?.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-600">Equity</div>
                <div className="text-lg font-bold text-slate-900">
                  ${connection.account_equity?.toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* Last Sync */}
          <div className="text-sm text-slate-600">
            {connection.last_sync ? (
              <>Last synced: {new Date(connection.last_sync).toLocaleString()}</>
            ) : (
              <>Never synced</>
            )}
          </div>

          {/* Error Message */}
          {connection.error_message && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {connection.error_message}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSync}
              disabled={syncing || connection.status !== 'connected'}
              className="flex-1"
            >
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Sync Now
                </>
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={() => onEdit(connection)}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => onDelete(connection.id)}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}