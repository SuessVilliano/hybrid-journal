import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, TrendingUp, TrendingDown, X, Check, Eye, Zap, Brain, RefreshCw, FileText, CheckSquare, Square, Trash2, EyeOff, Filter } from 'lucide-react';
import { format } from 'date-fns';
import WebhookSettings from '@/components/profile/WebhookSettings';
import AISignalAnalysis from '@/components/signals/AISignalAnalysis';
import SignalFilters from '@/components/signals/SignalFilters';
import RoutingRuleManager from '@/components/signals/RoutingRuleManager';
import { useBrowserNotifications, showSignalNotification } from '@/components/notifications/BrowserNotifications';
import { formatInTimezone } from '@/components/utils/timezoneHelper';
import SignalCard from '@/components/signals/SignalCard';
import { toast } from 'sonner';

export default function LiveTradingSignals() {
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [analyzingSignal, setAnalyzingSignal] = useState(null);
  const [showLogs, setShowLogs] = useState(false);
  const [filters, setFilters] = useState(() => {
    const saved = localStorage.getItem('signal_filters');
    return saved ? JSON.parse(saved) : {
      symbols: [],
      actions: [],
      providers: [],
      minConfidence: 0,
      maxConfidence: 100
    };
  });
  const [updatingSignalId, setUpdatingSignalId] = useState(null);
  const [routingSignalId, setRoutingSignalId] = useState(null);
  const [isMutating, setIsMutating] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');
  const { permission, requestPermission, isSupported } = useBrowserNotifications();

  useEffect(() => {
    localStorage.setItem('signal_filters', JSON.stringify(filters));
  }, [filters]);

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: signals = [], isLoading: isLoadingSignals, refetch: refetchSignals } = useQuery({
    queryKey: ['signals', user?.email],
    queryFn: async () => {
      if (!user?.email) {
        console.log('⚠️ No user email for signal query');
        return [];
      }
      console.log('🔍 Fetching signals for user:', user.email);
      
      try {
        const results = await base44.entities.Signal.filter({ user_email: user.email }, '-created_date', 500);
        console.log('📊 Signals fetched (filter by user_email):', results.length, 'signals');
        
        if (results.length > 0) {
          console.log('✅ Sample signal:', {
            user_email: results[0].user_email,
            created_by: results[0].created_by,
            symbol: results[0].symbol,
            provider: results[0].provider
          });
        }
        
        return results;
      } catch (error) {
        console.error('❌ Signal query error:', error);
        return [];
      }
    },
    enabled: !!user?.email,
    refetchInterval: isMutating ? false : 10000, // Pause refetch during mutations, slower interval
    onSuccess: (newSignals) => {
      // Check for new signals and show browser notification
      if (user?.notification_preferences?.browser_push && permission === 'granted') {
        const newUnseenSignals = newSignals.filter(s => s.status === 'new');
        const prevSignals = queryClient.getQueryData(['signals', user?.email]) || [];
        const prevNewSignals = prevSignals.filter(s => s.status === 'new');
        
        if (newUnseenSignals.length > prevNewSignals.length) {
          const latestSignal = newUnseenSignals[0];
          showSignalNotification(latestSignal, '/LiveTradingSignals');
        }
      }
    }
  });

  const { data: syncLogs = [], refetch: refetchLogs } = useQuery({
    queryKey: ['syncLogs', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.SyncLog.filter({ user_email: user.email, sync_type: 'webhook_signal' }, '-created_date', 20);
    },
    enabled: !!user?.email
  });

  const isLoading = isLoadingUser || isLoadingSignals;

  // Debug logging
  useEffect(() => {
    console.log('Current user email:', user?.email);
    console.log('Signals fetched:', signals);
    console.log('Signals count:', signals.length);
  }, [user, signals]);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      // Try the new function first, fallback to direct update
      try {
        const response = await base44.functions.invoke('updateSignalStatus', { signal_id: id, status });
        return response;
      } catch (fnError) {
        console.log('Function call failed, trying direct update:', fnError.message);
        // Fallback: try direct entity update (may fail due to permissions)
        await base44.entities.Signal.update(id, { status });
        return { data: { success: true, fallback: true } };
      }
    },
    onMutate: async (variables) => {
      setUpdatingSignalId(variables.id);
      setIsMutating(true);

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['signals', user?.email] });

      // Snapshot the previous value
      const previousSignals = queryClient.getQueryData(['signals', user?.email]);

      // Optimistically update the signal
      queryClient.setQueryData(['signals', user?.email], (old) => {
        if (!old) return old;
        return old.map(signal =>
          signal.id === variables.id
            ? { ...signal, status: variables.status }
            : signal
        );
      });

      return { previousSignals };
    },
    onSuccess: (response, variables, context) => {
      const success = response?.data?.success !== false;
      if (success) {
        if (variables.status === 'viewed') {
          toast.success('Signal marked as viewed');
        } else if (variables.status === 'ignored') {
          toast.success('Signal ignored');
        }
        // Sync the cache with the server-returned signal to prevent rollbacks
        if (response?.data?.signal) {
          queryClient.setQueryData(['signals', user?.email], (old) => {
            if (!old) return old;
            return old.map(s =>
              s.id === variables.id ? { ...s, ...response.data.signal } : s
            );
          });
        }
      } else {
        // Rollback on server rejection
        if (context?.previousSignals) {
          queryClient.setQueryData(['signals', user?.email], context.previousSignals);
        }
        toast.error(response?.data?.error || 'Failed to update signal');
      }
    },
    onError: (error, variables, context) => {
      console.error('Update mutation error:', error);
      // Rollback on error
      if (context?.previousSignals) {
        queryClient.setQueryData(['signals', user?.email], context.previousSignals);
      }
      toast.error('Failed to update signal: ' + error.message);
    },
    onSettled: (data, error) => {
      setUpdatingSignalId(null);
      setIsMutating(false);
      // Only invalidate on error so server state is re-fetched to recover from failure
      if (error) {
        queryClient.invalidateQueries({ queryKey: ['signals', user?.email] });
      }
    }
  });

  const routeTradeMutation = useMutation({
    mutationFn: ({ signal_id, override_approval }) =>
      base44.functions.invoke('routeTrade', { signal_id, override_approval }),
    onMutate: async (variables) => {
      setRoutingSignalId(variables.signal_id);
      setIsMutating(true);

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['signals', user?.email] });

      // Snapshot the previous value
      const previousSignals = queryClient.getQueryData(['signals', user?.email]);

      return { previousSignals };
    },
    onSuccess: (response, variables) => {
      if (response.data?.success) {
        // Update to executed on success
        queryClient.setQueryData(['signals', user?.email], (old) => {
          if (!old) return old;
          return old.map(signal =>
            signal.id === variables.signal_id
              ? { ...signal, status: 'executed', executed_at: new Date().toISOString() }
              : signal
          );
        });
        toast.success('Trade executed successfully!');
      } else {
        toast.warning(response.data?.approval_reason || 'Trade not approved for execution');
      }
    },
    onError: (error, variables, context) => {
      console.error('Route trade error:', error);
      // Rollback on error
      if (context?.previousSignals) {
        queryClient.setQueryData(['signals', user?.email], context.previousSignals);
      }
      toast.error('Routing failed: ' + error.message);
    },
    onSettled: () => {
      setRoutingSignalId(null);
      setIsMutating(false);
      // Don't invalidate - trust the optimistic/success update
    }
  });

  // Sort all signals by created_date descending, exclude ignored unless specifically filtered
  const today = new Date();
  const sortedSignals = (signals || [])
    .filter(s => !!s)
    .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

  const filteredSignals = sortedSignals.filter(signal => {
    if (!signal) return false;
    // Status filter
    if (statusFilter === 'all') {
      if (signal.status === 'ignored') return false; // hide ignored by default
    } else {
      if (signal.status !== statusFilter) return false;
    }
    // Provider tab filter
    if (providerFilter !== 'all' && signal.provider !== providerFilter) return false;
    // Symbol/action/provider/confidence filters
    if (filters.symbols.length > 0 && !filters.symbols.includes(signal.symbol)) return false;
    if (filters.actions.length > 0 && !filters.actions.includes(signal.action)) return false;
    if (filters.providers.length > 0 && !filters.providers.includes(signal.provider)) return false;
    const confidence = signal.confidence ?? 0;
    if (confidence < filters.minConfidence || confidence > filters.maxConfidence) return false;
    return true;
  });

  // Metrics computed from ALL sorted signals (not filtered)
  const WIN_STATUSES = ['tp1_hit', 'tp2_hit', 'tp3_hit', 'full_target'];
  const totalSignals = sortedSignals.length;
  const wins = sortedSignals.filter(s => WIN_STATUSES.includes(s.status)).length;
  const losses = sortedSignals.filter(s => s.status === 'stopped_out').length;
  const winRate = (wins + losses) > 0 ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';

  // Estimated points/pips
  let estGain = 0;
  let estLoss = 0;
  sortedSignals.forEach(s => {
    if (!s.price) return;
    if (WIN_STATUSES.includes(s.status)) {
      const tps = s.take_profits || [];
      let hitTp = null;
      if (s.status === 'full_target') hitTp = tps[tps.length - 1] ?? s.take_profit;
      else if (s.status === 'tp2_hit') hitTp = tps[1] ?? s.take_profit;
      else if (s.status === 'tp1_hit') hitTp = tps[0] ?? s.take_profit;
      else if (s.status === 'tp3_hit') hitTp = tps[2] ?? s.take_profit;
      if (hitTp) estGain += Math.abs(hitTp - s.price);
    } else if (s.status === 'stopped_out' && s.stop_loss) {
      estLoss += Math.abs(s.price - s.stop_loss);
    }
  });

  const newSignals = sortedSignals.filter(s => s?.status === 'new');
  const executedSignals = sortedSignals.filter(s => s?.status === 'executed');

  const resetFilters = () => {
    setFilters({
      symbols: [],
      actions: [],
      providers: [],
      minConfidence: 0,
      maxConfidence: 100
    });
  };

  const toggleSelectSignal = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredSignals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSignals.map(s => s.id)));
    }
  };

  const handleBulkIgnore = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    setIsMutating(true);
    await queryClient.cancelQueries({ queryKey: ['signals', user?.email] });
    // Optimistic update
    queryClient.setQueryData(['signals', user?.email], (old) =>
      old ? old.map(s => selectedIds.has(s.id) ? { ...s, status: 'ignored' } : s) : old
    );
    try {
      await Promise.all(
        [...selectedIds].map(id =>
          base44.functions.invoke('updateSignalStatus', { signal_id: id, status: 'ignored' })
            .catch(() => base44.entities.Signal.update(id, { status: 'ignored' }))
        )
      );
      toast.success(`${selectedIds.size} signal${selectedIds.size > 1 ? 's' : ''} ignored`);
    } catch (e) {
      queryClient.invalidateQueries({ queryKey: ['signals', user?.email] });
      toast.error('Some signals failed to update');
    } finally {
      setSelectedIds(new Set());
      setIsBulkProcessing(false);
      setIsMutating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkProcessing(true);
    setIsMutating(true);
    await queryClient.cancelQueries({ queryKey: ['signals', user?.email] });
    // Optimistic update — remove from cache immediately
    queryClient.setQueryData(['signals', user?.email], (old) =>
      old ? old.filter(s => !selectedIds.has(s.id)) : old
    );
    try {
      await Promise.all([...selectedIds].map(id => base44.entities.Signal.delete(id)));
      toast.success(`${selectedIds.size} signal${selectedIds.size > 1 ? 's' : ''} deleted`);
    } catch (e) {
      queryClient.invalidateQueries({ queryKey: ['signals', user?.email] });
      toast.error('Some signals failed to delete');
    } finally {
      setSelectedIds(new Set());
      setIsBulkProcessing(false);
      setIsMutating(false);
    }
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className={`text-2xl md:text-4xl font-bold bg-gradient-to-r ${
              darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
            } bg-clip-text text-transparent`}>
              Live Trading Signals
            </h1>
            <p className={`text-sm md:text-base mt-1 ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
              Real-time signals from TradingView and external sources
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isSupported && permission !== 'granted' && (
              <Button
                onClick={requestPermission}
                variant="outline"
                size="sm"
                className="border-cyan-500/30"
              >
                <Bell className="h-4 w-4 mr-1" />
                <span className="text-xs md:text-sm">Enable Alerts</span>
              </Button>
            )}
            {isSupported && permission === 'granted' && (
              <Button
                onClick={() => {
                  showSignalNotification({
                    id: 'demo',
                    provider: 'Demo',
                    symbol: 'EURUSD',
                    action: 'BUY',
                    price: 1.0850
                  }, '/LiveTradingSignals');
                }}
                variant="outline"
                size="sm"
                className="border-green-500/30"
              >
                <Bell className="h-4 w-4 mr-1" />
                <span className="text-xs md:text-sm">Test Alert</span>
              </Button>
            )}
            <Button
              onClick={async () => {
                try {
                  await Promise.all([
                    refetchSignals(),
                    refetchLogs()
                  ]);
                  queryClient.invalidateQueries({ queryKey: ['signals'] });
                  queryClient.invalidateQueries({ queryKey: ['syncLogs'] });
                } catch (error) {
                  console.error('Refresh failed:', error);
                }
              }}
              variant="outline"
              size="sm"
              className={darkMode ? 'text-cyan-400 border-cyan-500/30' : 'text-cyan-700 border-cyan-500/30'}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              <span className="text-xs md:text-sm">Refresh</span>
            </Button>
            <Button
              onClick={() => setShowLogs(!showLogs)}
              variant="outline"
              size="sm"
            >
              <FileText className="h-4 w-4 mr-1" />
              <span className="text-xs md:text-sm">{showLogs ? 'Hide' : 'Show'} Logs</span>
            </Button>
            <Button
              onClick={() => setShowWebhookInfo(!showWebhookInfo)}
              size="sm"
              className="bg-gradient-to-r from-cyan-500 to-purple-600"
            >
              <Zap className="h-4 w-4 mr-1" />
              <span className="text-xs md:text-sm">Webhook Setup</span>
            </Button>
          </div>
        </div>

        {/* Webhook Info */}
        {showWebhookInfo && <WebhookSettings />}

        {/* Routing Rules */}
        <RoutingRuleManager />

        {/* Sync Logs */}
        {showLogs && (
          <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
            <CardHeader>
              <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
                Webhook Sync Logs (Last 20)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {syncLogs.length === 0 ? (
                <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>No logs yet</p>
              ) : (
                <div className="space-y-2">
                  {syncLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-3 rounded-lg border ${
                        log.status === 'success'
                          ? darkMode ? 'bg-green-900/20 border-green-500/30' : 'bg-green-50 border-green-200'
                          : darkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={log.status === 'success' ? 'bg-green-600' : 'bg-red-600'}>
                              {log.status}
                            </Badge>
                            <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {format(new Date(log.created_date), 'MMM d, yyyy h:mm:ss a')}
                            </span>
                          </div>
                          <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                            {log.details || log.error_message || 'No details'}
                          </p>
                          {log.records_synced > 0 && (
                            <p className={`text-xs mt-1 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                              Records synced: {log.records_synced}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Status Filter Dropdown */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
          <Filter className={`h-4 w-4 flex-shrink-0 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Status:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'All Active' },
              { value: 'new', label: 'New' },
              { value: 'viewed', label: 'Viewed' },
              { value: 'executed', label: 'Executed' },
              { value: 'tp1_hit', label: 'TP1 Hit' },
              { value: 'tp2_hit', label: 'TP2 Hit' },
              { value: 'full_target', label: 'Full Target' },
              { value: 'stopped_out', label: 'Stopped Out' },
              { value: 'ignored', label: 'Ignored' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  statusFilter === opt.value
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white border-transparent'
                    : darkMode
                      ? 'border-slate-700 text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400'
                      : 'border-slate-200 text-slate-600 hover:border-cyan-400 hover:text-cyan-700'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <SignalFilters 
          filters={filters} 
          onFiltersChange={setFilters}
          onReset={resetFilters}
        />

        {/* Provider Filter Tabs */}
        <div className={`flex items-center gap-2 p-1 rounded-xl border ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
          {['all', 'Hybrid Ai', 'Solaris', 'Paradox'].map(p => (
            <button
              key={p}
              onClick={() => setProviderFilter(p)}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                providerFilter === p
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow'
                  : darkMode
                    ? 'text-slate-400 hover:text-cyan-400'
                    : 'text-slate-600 hover:text-cyan-700'
              }`}
            >
              {p === 'all' ? 'All Providers' : p}
            </button>
          ))}
        </div>

        {/* Metrics Summary Bar */}
        <div className={`grid grid-cols-2 md:grid-cols-5 gap-3`}>
          {[
            { label: 'Total Signals', value: totalSignals, color: darkMode ? 'text-white' : 'text-slate-900' },
            { label: 'Wins', value: wins, color: 'text-green-500' },
            { label: 'Losses', value: losses, color: 'text-red-500' },
            { label: 'Win Rate', value: `${winRate}%`, color: parseFloat(winRate) >= 50 ? 'text-green-500' : 'text-red-400' },
            { label: 'Est. Gain', value: estGain > 0 ? `+${estGain.toFixed(2)}` : '—', subValue: estLoss > 0 ? `-${estLoss.toFixed(2)}` : null, color: 'text-green-500' },
          ].map(stat => (
            <Card key={stat.label} className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
              <CardContent className="p-4">
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>{stat.label}</div>
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                {stat.subValue && <div className="text-xs font-medium text-red-500">{stat.subValue} loss</div>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Signals List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
            </div>
          ) : signals.length === 0 ? (
            <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
              <CardContent className="p-12 text-center">
                <Bell className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  No signals yet
                </h3>
                <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                  Configure your webhook to start receiving trading signals
                </p>
                <p className={`mt-4 text-sm ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  💡 Need help? Ask the Webhook Debugger AI agent in the AI Coach page
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Select All / Bulk Action Bar */}
              <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'
              }`}>
                <button
                  onClick={toggleSelectAll}
                  className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                    darkMode ? 'text-slate-300 hover:text-cyan-400' : 'text-slate-700 hover:text-cyan-600'
                  }`}
                >
                  {selectedIds.size === filteredSignals.length && filteredSignals.length > 0
                    ? <CheckSquare className="h-5 w-5 text-cyan-500" />
                    : <Square className="h-5 w-5" />
                  }
                  {selectedIds.size > 0
                    ? `${selectedIds.size} of ${filteredSignals.length} selected`
                    : `Select all (${filteredSignals.length})`
                  }
                </button>

                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBulkProcessing}
                      onClick={handleBulkIgnore}
                      className="border-yellow-500/40 text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-900/20"
                    >
                      <EyeOff className="h-4 w-4 mr-1" />
                      Ignore ({selectedIds.size})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isBulkProcessing}
                      onClick={handleBulkDelete}
                      className="border-red-500/40 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete ({selectedIds.size})
                    </Button>
                    <button
                      onClick={() => setSelectedIds(new Set())}
                      className={`text-xs underline ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Clear
                    </button>
                    {isBulkProcessing && (
                      <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                )}
              </div>

              {filteredSignals.map((signal) => (
                <div key={signal.id} className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelectSignal(signal.id)}
                    className={`mt-4 flex-shrink-0 transition-colors ${
                      darkMode ? 'text-slate-400 hover:text-cyan-400' : 'text-slate-400 hover:text-cyan-600'
                    }`}
                  >
                    {selectedIds.has(signal.id)
                      ? <CheckSquare className="h-5 w-5 text-cyan-500" />
                      : <Square className="h-5 w-5" />
                    }
                  </button>
                  <div className="flex-1 min-w-0">
                    <SignalCard
                      signal={signal}
                      user={user}
                      onAnalyze={setAnalyzingSignal}
                      onRoute={(id, override) => routeTradeMutation.mutate({ signal_id: id, override_approval: override })}
                      onForceExecute={(id) => routeTradeMutation.mutate({ signal_id: id, override_approval: true })}
                      onMarkViewed={(id) => updateStatusMutation.mutate({ id, status: 'viewed' })}
                      onIgnore={(id) => updateStatusMutation.mutate({ id, status: 'ignored' })}
                      isRouting={routingSignalId === signal.id}
                      isUpdating={updatingSignalId === signal.id}
                    />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* AI Analysis Modal */}
        {analyzingSignal && (
          <AISignalAnalysis
            signal={analyzingSignal}
            isOpen={!!analyzingSignal}
            onClose={() => setAnalyzingSignal(null)}
          />
        )}
      </div>
    </div>
  );
}