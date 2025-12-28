import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, TrendingUp, TrendingDown, X, Check, Eye, Copy, ExternalLink, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LiveTradingSignals() {
  const [showWebhookInfo, setShowWebhookInfo] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: signals = [], isLoading } = useQuery({
    queryKey: ['signals'],
    queryFn: () => base44.entities.Signal.list('-created_date', 100),
    refetchInterval: 5000 // Auto-refresh every 5 seconds
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, trade_id }) => 
      base44.entities.Signal.update(id, { 
        status, 
        executed_at: status === 'executed' ? new Date().toISOString() : undefined,
        trade_id 
      }),
    onSuccess: () => queryClient.invalidateQueries(['signals'])
  });

  const webhookUrl = user ? `${window.location.origin}/api/functions/ingestSignal` : '';

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const newSignals = signals.filter(s => s.status === 'new');
  const viewedSignals = signals.filter(s => s.status === 'viewed');
  const executedSignals = signals.filter(s => s.status === 'executed');

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
              Real-time signals from TradingView and other sources
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
        {showWebhookInfo && (
          <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
            <CardHeader>
              <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
                Webhook Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Your Webhook URL</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleCopyWebhook} variant="outline">
                    {copiedWebhook ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
                <h4 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  TradingView Alert Setup:
                </h4>
                <ol className={`list-decimal list-inside space-y-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li>Create an alert in TradingView</li>
                  <li>In the "Notifications" tab, enable "Webhook URL"</li>
                  <li>Paste your webhook URL above</li>
                  <li>Use this message format:</li>
                </ol>
                <pre className={`mt-2 p-3 rounded text-xs overflow-x-auto ${darkMode ? 'bg-slate-800 text-cyan-400' : 'bg-white text-slate-900'}`}>
{`{
  "provider": "TradingView",
  "ticker": "{{ticker}}",
  "action": "BUY",
  "close": {{close}},
  "interval": "{{interval}}",
  "stop_loss": {{close}} * 0.98,
  "take_profit": {{close}} * 1.02,
  "strategy_name": "My Strategy"
}`}
                </pre>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => window.open('https://www.tradingview.com/support/solutions/43000529348-i-want-to-know-more-about-webhooks/', '_blank')}
                  variant="outline"
                  size="sm"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  TradingView Webhook Docs
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
            signals.map((signal) => (
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
                          <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Price</div>
                          <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            ${signal.price.toFixed(2)}
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
                        {signal.take_profit > 0 && (
                          <div>
                            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Take Profit</div>
                            <div className={`font-bold text-green-500`}>
                              ${signal.take_profit.toFixed(2)}
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
                            onClick={() => updateStatusMutation.mutate({ id: signal.id, status: 'executed' })}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <Check className="h-4 w-4 md:mr-2" />
                            <span className="hidden md:inline">Execute</span>
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
                        <Button
                          onClick={() => updateStatusMutation.mutate({ id: signal.id, status: 'executed' })}
                          className="bg-green-600 hover:bg-green-700"
                          size="sm"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Execute
                        </Button>
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
      </div>
    </div>
  );
}