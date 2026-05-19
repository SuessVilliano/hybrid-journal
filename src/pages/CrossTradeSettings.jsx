import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Repeat, RefreshCw, CheckCircle2, AlertCircle, Trash2, Activity,
  Zap, Shield, KeyRound, ArrowRight, Plug
} from 'lucide-react';
import { toast } from 'sonner';

export default function CrossTradeSettings() {
  const queryClient = useQueryClient();

  const [apiKey, setApiKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState(null); // { valid, accounts, message }
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [autoSyncDone, setAutoSyncDone] = useState(false);

  const darkMode = document.documentElement.classList.contains('dark');

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['crosstradeConnections'],
    queryFn: async () => {
      try {
        return await base44.entities.CrossTradeConnection.list('-created_date');
      } catch {
        return [];
      }
    }
  });

  const { data: syncEvents = [] } = useQuery({
    queryKey: ['crosstradeSyncEvents'],
    queryFn: async () => {
      try {
        const all = await base44.entities.SyncEventLog.list('-created_date', 50);
        return all.filter(e => e.source === 'CrossTrade');
      } catch {
        return [];
      }
    }
  });

  const activeConnections = connections.filter(c => c.status === 'active');

  // Headless auto-sync when the page loads with active connections.
  useEffect(() => {
    if (!autoSyncDone && activeConnections.length > 0) {
      setAutoSyncDone(true);
      base44.functions.invoke('crosstradeSync', {})
        .then(() => {
          queryClient.invalidateQueries(['crosstradeConnections']);
          queryClient.invalidateQueries(['crosstradeSyncEvents']);
          queryClient.invalidateQueries(['trades']);
        })
        .catch(() => {});
    }
  }, [activeConnections.length, autoSyncDone, queryClient]);

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      toast.error('Enter your CrossTrade API key');
      return;
    }
    setValidating(true);
    setValidation(null);
    try {
      const res = await base44.functions.invoke('crosstradeAPI', {
        action: 'validate',
        apiKey: apiKey.trim()
      });
      const data = res.data;
      if (data.valid) {
        setValidation({ valid: true, accounts: data.accounts || [] });
        setSelectedAccounts((data.accounts || []).map(a => a.id));
        toast.success(`Connected to CrossTrade — found ${data.accounts?.length || 0} account(s)`);
      } else {
        setValidation({ valid: false, message: data.message || 'Validation failed' });
        toast.error(data.message || 'CrossTrade rejected the API key');
      }
    } catch (error) {
      setValidation({ valid: false, message: error.message });
      toast.error('Validation error: ' + error.message);
    } finally {
      setValidating(false);
    }
  };

  const toggleAccount = (id) => {
    setSelectedAccounts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleConnect = async () => {
    if (selectedAccounts.length === 0) {
      toast.error('Select at least one account to sync');
      return;
    }
    setConnecting(true);
    try {
      const accounts = validation.accounts.filter(a => selectedAccounts.includes(a.id));
      await base44.entities.CrossTradeConnection.create({
        api_key: apiKey.trim(),
        transport: 'rest',
        accounts,
        default_account: accounts[0].id,
        status: 'active',
        auto_sync: true,
        route_enabled: false,
        connected_at: new Date().toISOString(),
        total_trades_synced: 0
      });
      toast.success('CrossTrade connected');
      setApiKey('');
      setValidation(null);
      setSelectedAccounts([]);
      queryClient.invalidateQueries(['crosstradeConnections']);
    } catch (error) {
      toast.error('Failed to connect: ' + error.message);
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async (connectionId) => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke(
        'crosstradeSync',
        connectionId ? { connectionId } : {}
      );
      const data = res.data;
      if (data.success) {
        toast.success(
          `Sync complete — ${data.tradesCreated || 0} new, ${data.tradesUpdated || 0} updated`
        );
      } else {
        toast.error('Sync failed: ' + (data.error || 'unknown error'));
      }
      queryClient.invalidateQueries(['crosstradeConnections']);
      queryClient.invalidateQueries(['crosstradeSyncEvents']);
      queryClient.invalidateQueries(['trades']);
    } catch (error) {
      toast.error('Sync error: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const updateConnection = async (id, patch) => {
    try {
      await base44.entities.CrossTradeConnection.update(id, patch);
      queryClient.invalidateQueries(['crosstradeConnections']);
    } catch (error) {
      toast.error('Update failed: ' + error.message);
    }
  };

  const disconnect = async (id) => {
    if (!confirm('Disconnect this CrossTrade account? Trades already synced stay in your journal.')) {
      return;
    }
    try {
      await base44.entities.CrossTradeConnection.delete(id);
      queryClient.invalidateQueries(['crosstradeConnections']);
      toast.success('CrossTrade account disconnected');
    } catch (error) {
      toast.error('Failed to disconnect: ' + error.message);
    }
  };

  const cardBg = darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white';

  return (
    <div className={`min-h-screen p-6 transition-colors ${
      darkMode
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
        : 'bg-gradient-to-br from-slate-50 to-slate-100'
    }`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className={`text-4xl font-bold bg-gradient-to-r ${
              darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
            } bg-clip-text text-transparent`}>
              CrossTrade Copy
            </h1>
            <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-slate-600 mt-1'}>
              Connect CrossTrade as your copier — trades sync straight into your journal
            </p>
          </div>
          {activeConnections.length > 0 && (
            <Button
              onClick={() => handleSync(null)}
              disabled={syncing}
              variant="outline"
              className={darkMode ? 'border-cyan-500/30 hover:bg-cyan-500/10' : ''}
            >
              {syncing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync All
            </Button>
          )}
        </div>

        {/* Info Banner */}
        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-gradient-to-r from-cyan-50 to-purple-50 border-cyan-200'}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Zap className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <div>
                <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  CrossTrade Integration
                </h3>
                <ul className={`text-sm space-y-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Headless connection with your own CrossTrade API key
                  </li>
                  <li className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-cyan-500" />
                    Executions sync automatically as journal trades (idempotent)
                  </li>
                  <li className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    Account balance &amp; position snapshots for risk tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <ArrowRight className="h-4 w-4 text-blue-500" />
                    Route trades out to CrossTrade — a drop-in copier alternative to HybridCopy
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Connect CrossTrade */}
        <Card className={cardBg}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              Connect CrossTrade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Create an API key in your CrossTrade dashboard (app.crosstrade.io &rarr; Settings &rarr; API Keys)
              and paste it below. The key is stored encrypted and used only to sync your trades.
            </p>

            <div className="flex items-center gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="CrossTrade API key"
                className={`font-mono text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : ''}`}
              />
              <Button
                onClick={handleValidate}
                disabled={validating}
                variant="outline"
                className={darkMode ? 'border-cyan-500/30 hover:bg-cyan-500/10 whitespace-nowrap' : 'whitespace-nowrap'}
              >
                {validating ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Validating...</>
                ) : (
                  <><Plug className="h-4 w-4 mr-2" />Validate</>
                )}
              </Button>
            </div>

            {validation && !validation.valid && (
              <div className="p-3 rounded-lg flex items-center gap-2 bg-red-50 border border-red-200">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <span className="text-sm text-red-800">{validation.message}</span>
              </div>
            )}

            {validation && validation.valid && (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  darkMode ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'
                }`}>
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                    API key valid. Select the account(s) you want to sync.
                  </span>
                </div>

                {validation.accounts.length === 0 ? (
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    No accounts found on this CrossTrade key.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {validation.accounts.map(account => (
                      <button
                        type="button"
                        key={account.id}
                        onClick={() => toggleAccount(account.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors ${
                          selectedAccounts.includes(account.id)
                            ? (darkMode ? 'bg-cyan-900/30 border-cyan-500/50' : 'bg-cyan-50 border-cyan-300')
                            : (darkMode ? 'bg-slate-900/50 border-slate-700' : 'border-slate-200')
                        }`}
                      >
                        <div>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {account.name || account.id}
                          </p>
                          {account.broker && (
                            <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                              {account.broker}
                            </p>
                          )}
                        </div>
                        {selectedAccounts.includes(account.id) && (
                          <CheckCircle2 className="h-5 w-5 text-cyan-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleConnect}
                  disabled={connecting || selectedAccounts.length === 0}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
                >
                  {connecting ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Connecting...</>
                  ) : (
                    <><Repeat className="h-4 w-4 mr-2" />Connect CrossTrade</>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Accounts */}
        <Card className={cardBg}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-white' : ''}>Connected CrossTrade Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
              </div>
            ) : connections.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <Repeat className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No CrossTrade accounts connected yet</p>
                <p className="text-sm mt-1">Validate an API key above to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map(conn => (
                  <div
                    key={conn.id}
                    className={`p-4 rounded-lg ${
                      darkMode ? 'bg-slate-900/50 border border-slate-700' : 'border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${
                          conn.status === 'active' ? 'bg-green-500/10' : 'bg-red-500/10'
                        }`}>
                          {conn.status === 'active' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className={`font-bold ${darkMode ? 'text-white' : ''}`}>
                            {(conn.accounts || []).map(a => a.name || a.id || a).join(', ') || 'CrossTrade'}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {conn.total_trades_synced || 0} trades synced
                            {conn.last_sync_at && ` • Last: ${new Date(conn.last_sync_at).toLocaleString()}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={conn.status === 'active' ? 'default' : 'outline'}>
                          {conn.status}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSync(conn.id)}
                          disabled={syncing}
                          title="Sync now"
                        >
                          <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''} text-cyan-500`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => disconnect(conn.id)}
                          title="Disconnect"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {conn.last_error && (
                      <p className="text-xs text-red-500 mt-2 ml-12">{conn.last_error}</p>
                    )}

                    <div className="flex flex-wrap gap-6 mt-3 ml-12">
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={!!conn.auto_sync}
                          onCheckedChange={(v) => updateConnection(conn.id, { auto_sync: v })}
                        />
                        <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Auto-sync on load
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={!!conn.route_enabled}
                          onCheckedChange={(v) => updateConnection(conn.id, { route_enabled: v })}
                        />
                        <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          Route trades to this account
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync History */}
        <Card className={cardBg}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-white' : ''}>Recent CrossTrade Syncs</CardTitle>
          </CardHeader>
          <CardContent>
            {syncEvents.length === 0 ? (
              <p className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                No sync events yet
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {syncEvents.slice(0, 12).map(event => (
                  <div
                    key={event.id}
                    className={`flex items-center justify-between p-3 rounded text-sm ${
                      darkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className={
                          event.status === 'processed' ? 'border-green-500 text-green-500' :
                          event.status === 'failed' ? 'border-red-500 text-red-500' :
                          'border-yellow-500 text-yellow-500'
                        }
                      >
                        {event.status}
                      </Badge>
                      <span className={darkMode ? 'text-slate-300' : ''}>{event.event_type}</span>
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      {new Date(event.created_date).toLocaleString()}
                      {event.trades_created > 0 && (
                        <span className="ml-2 text-green-500">+{event.trades_created} trades</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security note */}
        <div className={`flex items-start gap-2 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
          <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            Your CrossTrade API key is stored encrypted and never leaves your account. Use a key
            scoped to the accounts you want to journal.
          </span>
        </div>
      </div>
    </div>
  );
}
