import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, TrendingUp, TrendingDown, X, Check, Eye, Zap, Brain, RefreshCw, FileText } from 'lucide-react';
import { format } from 'date-fns';
import WebhookSettings from '@/components/profile/WebhookSettings';
import AISignalAnalysis from '@/components/signals/AISignalAnalysis';
import SignalFilters from '@/components/signals/SignalFilters';
import RoutingRuleManager from '@/components/signals/RoutingRuleManager';
import { useBrowserNotifications, showSignalNotification } from '@/components/notifications/BrowserNotifications';
import { formatInTimezone } from '@/components/utils/timezoneHelper';
import SignalCard from '@/components/signals/SignalCard';

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
        const results = await base44.entities.Signal.filter({ user_email: user.email }, '-created_date', 100);
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
    refetchInterval: 5000,
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
    mutationFn: ({ id, status, trade_id }) => 
      base44.entities.Signal.update(id, { 
        status, 
        executed_at: status === 'executed' ? new Date().toISOString() : undefined,
        trade_id 
      }),
    onSuccess: () => queryClient.invalidateQueries(['signals'])
  });

  const routeTradeMutation = useMutation({
    mutationFn: ({ signal_id, override_approval }) =>
      base44.functions.invoke('routeTrade', { signal_id, override_approval }),
    onSuccess: () => {
      queryClient.invalidateQueries(['signals']);
    }
  });

  const filteredSignals = signals.filter(signal => {
    if (filters.symbols.length > 0 && !filters.symbols.includes(signal.symbol)) return false;
    if (filters.actions.length > 0 && !filters.actions.includes(signal.action)) return false;
    if (filters.providers.length > 0 && !filters.providers.includes(signal.provider)) return false;
    if (signal.confidence < filters.minConfidence || signal.confidence > filters.maxConfidence) return false;
    return true;
  });

  const newSignals = filteredSignals.filter(s => s.status === 'new');
  const viewedSignals = filteredSignals.filter(s => s.status === 'viewed');
  const executedSignals = filteredSignals.filter(s => s.status === 'executed');

  const resetFilters = () => {
    setFilters({
      symbols: [],
      actions: [],
      providers: [],
      minConfidence: 0,
      maxConfidence: 100
    });
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

        {/* Filters */}
        <SignalFilters 
          filters={filters} 
          onFiltersChange={setFilters}
          onReset={resetFilters}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'} ${newSignals.length > 0 ? 'ring-2 ring-cyan-500 animate-pulse' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>New Signals</div>
                  <div className={`text-3xl font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    {newSignals.length}
                  </div>
                </div>
                <Bell className={`h-8 w-8 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              </div>
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Executed</div>
                  <div className={`text-3xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                    {executedSignals.length}
                  </div>
                </div>
                <Check className={`h-8 w-8 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              </div>
            </CardContent>
          </Card>

          <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Today</div>
                  <div className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {signals.filter(s => {
                      const signalDate = new Date(s.created_date);
                      const today = new Date();
                      return signalDate.toDateString() === today.toDateString();
                    }).length}
                  </div>
                </div>
                <Zap className={`h-8 w-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              </div>
            </CardContent>
          </Card>
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
            filteredSignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                user={user}
                onAnalyze={setAnalyzingSignal}
                onRoute={(id, override) => routeTradeMutation.mutate({ signal_id: id, override_approval: override })}
                onForceExecute={(id) => routeTradeMutation.mutate({ signal_id: id, override_approval: true })}
                onMarkViewed={(id) => updateStatusMutation.mutate({ id, status: 'viewed' })}
                onIgnore={(id) => updateStatusMutation.mutate({ id, status: 'ignored' })}
                isRouting={routeTradeMutation.isPending}
              />
            ))
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