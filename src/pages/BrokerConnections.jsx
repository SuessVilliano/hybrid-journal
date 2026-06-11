import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Link as LinkIcon, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import BrokerConnectionForm from '@/components/brokers/BrokerConnectionForm';
import BrokerConnectionCard from '@/components/brokers/BrokerConnectionCard';
import AutoSyncManager from '@/components/brokers/AutoSyncManager';
import { syncBrokerTrades } from '@/components/brokers/brokerAPIHelper';

export default function BrokerConnections() {
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [loginSyncDone, setLoginSyncDone] = useState(false);

  const queryClient = useQueryClient();

  // Admin-only page (client-side gate; server-side enforcement still needed)
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });
  const isAdmin = currentUser?.role === 'admin';

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['brokerConnections'],
    queryFn: () => base44.entities.BrokerConnection.list('-created_date', 50),
    enabled: isAdmin
  });

  const createConnectionMutation = useMutation({
    mutationFn: (data) => base44.entities.BrokerConnection.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokerConnections'] });
      setShowForm(false);
      setEditingConnection(null);
    }
  });

  const updateConnectionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BrokerConnection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokerConnections'] });
      setShowForm(false);
      setEditingConnection(null);
    }
  });

  const deleteConnectionMutation = useMutation({
    mutationFn: (id) => base44.entities.BrokerConnection.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brokerConnections'] });
    }
  });

  const handleSubmit = (data) => {
    if (editingConnection) {
      updateConnectionMutation.mutate({ id: editingConnection.id, data });
    } else {
      createConnectionMutation.mutate(data);
    }
  };

  const handleSync = async (connection) => {
    try {
      const result = await syncBrokerTrades(connection);

      // Update only the sync fields — spreading the whole (possibly stale)
      // connection object would clobber concurrent changes. `last_sync_at`
      // is canonical; `last_sync` is written during the transition.
      const syncedAt = new Date().toISOString();
      const data = {
        last_sync_at: syncedAt,
        last_sync: syncedAt,
        status: 'connected',
        error_message: null
      };
      if (typeof result?.account_balance === 'number') {
        data.account_balance = result.account_balance;
        data.account_equity = result.account_equity;
      }
      await updateConnectionMutation.mutateAsync({ id: connection.id, data });

      queryClient.invalidateQueries({ queryKey: ['trades'] });
      
      alert(`✅ Sync complete!\n${result.imported} new trades imported\n${result.skipped} trades already exist`);
    } catch (error) {
      await updateConnectionMutation.mutateAsync({
        id: connection.id,
        data: {
          status: 'error',
          error_message: error.message
        }
      });
      alert(`❌ Sync failed: ${error.message}`);
    }
  };

  const handleDelete = (id) => {
    if (confirm('Are you sure? This will not delete imported trades.')) {
      deleteConnectionMutation.mutate(id);
    }
  };

  // Sync all connected accounts
  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      const response = await base44.functions.invoke('onLoginSync', {});
      const data = response.data;

      queryClient.invalidateQueries({ queryKey: ['brokerConnections'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });

      if (data.success) {
        alert(`✅ Sync complete!\n${data.synced} accounts synced\n${data.skipped} skipped (recently synced)\n${data.errors} errors`);
      } else {
        alert(`⚠️ Sync partially failed: ${data.error}`);
      }
    } catch (error) {
      alert(`❌ Sync all failed: ${error.message}`);
    } finally {
      setSyncingAll(false);
    }
  };

  // Auto-sync on first page load (simulates on-login sync)
  useEffect(() => {
    if (!loginSyncDone && connections.length > 0) {
      setLoginSyncDone(true);
      // Trigger background sync - don't wait for it
      base44.functions.invoke('onLoginSync', {}).then(() => {
        queryClient.invalidateQueries({ queryKey: ['brokerConnections'] });
        queryClient.invalidateQueries({ queryKey: ['trades'] });
      }).catch(err => {
        console.log('[LoginSync] Background sync error:', err.message);
      });
    }
  }, [connections, loginSyncDone]);

  const darkMode = document.documentElement.classList.contains('dark');

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className={`min-h-screen p-6 flex items-center justify-center ${
        darkMode
          ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
          : 'bg-gradient-to-br from-slate-50 to-slate-100'
      }`}>
        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <h2 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>Access Denied</h2>
            <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>This page is only accessible to admin users.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 transition-colors ${
      darkMode
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
        : 'bg-gradient-to-br from-slate-50 to-slate-100'
    }`}>
      <AutoSyncManager />
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-4xl font-bold bg-gradient-to-r ${
              darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
            } bg-clip-text text-transparent`}>
              Broker Connections
            </h1>
            <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-slate-600 mt-1'}>
              Connect your trading accounts for automatic sync
            </p>
          </div>
          <div className="flex gap-3">
            {connections.length > 0 && (
              <Button
                onClick={handleSyncAll}
                disabled={syncingAll}
                variant="outline"
                className={darkMode ? 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}
              >
                {syncingAll ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Syncing All...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync All
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={() => {
                setEditingConnection(null);
                setShowForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Broker
            </Button>
          </div>
        </div>

        {/* Info Banner */}
        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <LinkIcon className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-cyan-400' : 'text-blue-600'}`} />
              <div>
                <h3 className={`font-bold mb-2 flex items-center gap-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Broker Integration Features
                  <Badge className="bg-green-100 text-green-800">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Auto-Sync Active
                  </Badge>
                </h3>
                <ul className={`text-sm space-y-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li>✓ Automatic trade history sync from your broker accounts</li>
                  <li>✓ Real-time account balance and equity tracking</li>
                  <li>✓ Secure encrypted API credential storage</li>
                  <li>✓ Configurable sync intervals (every 5-60 minutes)</li>
                  <li>✓ Background sync without manual intervention</li>
                  <li>✓ Support for MT4/MT5, cTrader, DXTrade, Binance, Kraken, Tradovate, NinjaTrader, and more</li>
                  <li>✓ Kraken crypto API (read-only key required)</li>
                  <li>✓ Tradovate futures (live &amp; demo environments)</li>
                  <li>✓ NinjaTrader via statement import (CSV/Excel export)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connection List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : connections.length === 0 ? (
          <Card className={`p-12 text-center ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}`}>
            <LinkIcon className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-slate-700' : 'text-slate-300'}`} />
            <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>No broker connections yet</h3>
            <p className={`mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Connect your broker account to automatically import trades and track balances
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Connect Your First Broker
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map(connection => (
              <BrokerConnectionCard
                key={connection.id}
                connection={connection}
                onEdit={(conn) => {
                  setEditingConnection(conn);
                  setShowForm(true);
                }}
                onDelete={handleDelete}
                onSync={handleSync}
              />
            ))}
          </div>
        )}

        {/* Connection Form */}
        {showForm && (
          <BrokerConnectionForm
            connection={editingConnection}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingConnection(null);
            }}
          />
        )}
      </div>
    </div>
  );
}