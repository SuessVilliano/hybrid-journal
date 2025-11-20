import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Settings, Trash2, CheckCircle, XCircle, Clock, DollarSign, History } from 'lucide-react';
import { syncBrokerTrades } from './brokerAPIHelper';
import SyncLogViewer from './SyncLogViewer';

export default function BrokerConnectionCard({ connection, onEdit, onDelete, onSync }) {
  const [syncing, setSyncing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const darkMode = document.documentElement.classList.contains('dark');

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
    <>
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-slate-200'}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className={`text-lg ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {connection.broker_name}
              </CardTitle>
              <p className={`text-sm ${darkMode ? 'text-cyan-400/70' : 'text-slate-600'}`}>
                Account: {connection.account_number}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {/* Account Info */}
            {connection.account_balance !== undefined && (
              <div className={`grid grid-cols-2 gap-4 p-3 rounded-lg ${
                darkMode ? 'bg-slate-900/50' : 'bg-slate-50'
              }`}>
                <div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Balance</div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    ${connection.account_balance?.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Equity</div>
                  <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    ${connection.account_equity?.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Last Sync */}
            <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {connection.last_sync ? (
                <>Last synced: {new Date(connection.last_sync).toLocaleString()}</>
              ) : (
                <>Never synced</>
              )}
            </div>

            {/* Error Message */}
            {connection.error_message && (
              <div className={`text-sm p-2 rounded ${
                darkMode ? 'text-red-300 bg-red-500/10 border border-red-500/30' : 'text-red-600 bg-red-50'
              }`}>
                {connection.error_message}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSync}
                disabled={syncing || connection.status !== 'connected'}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
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
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setShowLogs(true)}
                className={darkMode ? 'border-cyan-500/30 text-cyan-400' : 'border-slate-300 text-slate-700'}
              >
                <History className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onEdit(connection)}
                className={darkMode ? 'border-cyan-500/30 text-cyan-400' : 'border-slate-300 text-slate-700'}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => onDelete(connection.id)}
                className={darkMode ? 'border-red-500/30 text-red-400' : 'border-red-300 text-red-700'}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showLogs && <SyncLogViewer connectionId={connection.id} onClose={() => setShowLogs(false)} />}
    </>
  );
}