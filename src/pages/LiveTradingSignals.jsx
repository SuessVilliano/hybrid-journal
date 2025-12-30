import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, TrendingUp, TrendingDown, X, Check, Eye, Zap, Brain } from 'lucide-react';
import { format } from 'date-fns';
import WebhookSettings from '@/components/profile/WebhookSettings';
import AISignalAnalysis from '@/components/signals/AISignalAnalysis';
import SignalFilters from '@/components/signals/SignalFilters';

export default function LiveTradingSignals() {
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [analyzingSignal, setAnalyzingSignal] = useState(null);
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

  useEffect(() => {
    localStorage.setItem('signal_filters', JSON.stringify(filters));
  }, [filters]);

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: signals = [], isLoading: isLoadingSignals } = useQuery({
    queryKey: ['signals', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Signal.filter({ user_email: user.email }, '-created_date', 100);
    },
    enabled: !!user?.email,
    refetchInterval: 5000
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
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
              darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
            } bg-clip-text text-transparent`}>
              Live Trading Signals
            </h1>
            <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
              Real-time signals from TradingView and external sources
            </p>
          </div>
          <Button
            onClick={() => setShowWebhookInfo(!showWebhookInfo)}
            className="bg-gradient-to-r from-cyan-500 to-purple-600"
          >
            <Zap className="h-4 w-4 mr-2" />
            Webhook Setup
          </Button>
        </div>

        {/* Webhook Info */}
        {showWebhookInfo && <WebhookSettings />}

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
              </CardContent>
            </Card>
          ) : (
            filteredSignals.map((signal) => (
              <Card 
                key={signal.id} 
                className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'} ${
                  signal.status === 'new' ? 'ring-2 ring-cyan-500' : ''
                } transition-all hover:shadow-lg`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        {signal.action === 'BUY' ? (
                          <TrendingUp className="h-6 w-6 text-green-500" />
                        ) : (
                          <TrendingDown className="h-6 w-6 text-red-500" />
                        )}
                        <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                          {signal.symbol}
                        </h3>
                        <Badge className={signal.action === 'BUY' ? 'bg-green-500' : 'bg-red-500'}>
                          {signal.action}
                        </Badge>
                        <Badge variant="outline">{signal.provider}</Badge>
                        {signal.status === 'new' && (
                          <Badge className="bg-cyan-500 animate-pulse">NEW</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                        <div>
                          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Entry Price</div>
                          <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            ${signal.price?.toFixed(2) || 'N/A'}
                          </div>
                        </div>
                        {signal.stop_loss > 0 && (
                          <div>
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Stop Loss</div>
                            <div className={`font-bold text-red-500`}>
                              ${signal.stop_loss.toFixed(2)}
                            </div>
                          </div>
                        )}
                        {signal.timeframe && (
                          <div>
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Timeframe</div>
                            <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {signal.timeframe}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Display multiple take profits if available */}
                      {signal.take_profits && signal.take_profits.length > 0 && (
                        <div className="mb-3">
                          <div className={`text-xs mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Take Profits</div>
                          <div className="flex flex-wrap gap-2">
                            {signal.take_profits.map((tp, idx) => (
                              <div key={idx} className={`px-3 py-1 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                                <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                                  TP{idx + 1}:
                                </span>
                                <span className={`ml-1 font-bold text-green-500`}>
                                  ${tp.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Fallback to single take_profit if no array */}
                      {(!signal.take_profits || signal.take_profits.length === 0) && signal.take_profit > 0 && (
                        <div className="mb-3">
                          <div className={`text-xs mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Take Profit</div>
                          <div className={`px-3 py-1 rounded-lg inline-block ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                            <span className={`font-bold text-green-500`}>
                              ${signal.take_profit.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs">
                        <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                          {format(new Date(signal.created_date), 'MMM d, yyyy h:mm a')}
                        </span>
                        {signal.strategy && (
                          <>
                            <span className={darkMode ? 'text-slate-600' : 'text-slate-400'}>•</span>
                            <span className={darkMode ? 'text-cyan-400' : 'text-cyan-600'}>
                              {signal.strategy}
                            </span>
                          </>
                        )}
                      </div>

                      {signal.notes && (
                        <p className={`mt-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {signal.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex md:flex-col gap-2">
                      {signal.status === 'new' && (
                        <>
                          <Button
                            onClick={() => setAnalyzingSignal(signal)}
                            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                            size="sm"
                          >
                            <Brain className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Analyze</span>
                          </Button>
                          <Button
                            onClick={() => routeTradeMutation.mutate({ 
                              signal_id: signal.id, 
                              override_approval: false 
                            })}
                            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
                            size="sm"
                            disabled={routeTradeMutation.isLoading}
                          >
                            <Zap className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">
                              {routeTradeMutation.isLoading ? 'Processing...' : 'AI Route'}
                            </span>
                          </Button>
                          <Button
                            onClick={() => routeTradeMutation.mutate({ 
                              signal_id: signal.id, 
                              override_approval: true 
                            })}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                            disabled={routeTradeMutation.isLoading}
                          >
                            <Check className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Force Execute</span>
                          </Button>
                          <Button
                            onClick={() => updateStatusMutation.mutate({ id: signal.id, status: 'viewed' })}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Mark Viewed</span>
                          </Button>
                          <Button
                            onClick={() => updateStatusMutation.mutate({ id: signal.id, status: 'ignored' })}
                            variant="outline"
                            size="sm"
                          >
                            <X className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Ignore</span>
                          </Button>
                        </>
                      )}
                      {signal.status === 'viewed' && (
                        <>
                          <Button
                            onClick={() => routeTradeMutation.mutate({ 
                              signal_id: signal.id, 
                              override_approval: false 
                            })}
                            className="bg-gradient-to-r from-cyan-500 to-purple-600"
                            size="sm"
                            disabled={routeTradeMutation.isLoading}
                          >
                            <Zap className="h-4 w-4 md:mr-2" />
                            AI Route
                          </Button>
                          <Button
                            onClick={() => routeTradeMutation.mutate({ 
                              signal_id: signal.id, 
                              override_approval: true 
                            })}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Force Execute
                          </Button>
                        </>
                      )}
                      {signal.status === 'executed' && (
                        <Badge className="bg-green-500">Executed</Badge>
                      )}
                      {signal.status === 'ignored' && (
                        <Badge variant="outline">Ignored</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
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