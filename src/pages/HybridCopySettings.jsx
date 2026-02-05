import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Link2, Copy, CheckCircle2, Clock, AlertCircle, Trash2,
  RefreshCw, Activity, ArrowRight, Shield, Zap
} from 'lucide-react';
import { toast } from 'sonner';

export default function HybridCopySettings() {
  const [linkToken, setLinkToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  const queryClient = useQueryClient();

  const { data: connectedApps = [], isLoading: loadingApps } = useQuery({
    queryKey: ['connectedApps'],
    queryFn: () => base44.entities.ConnectedApp.list()
  });

  const { data: syncEvents = [], isLoading: loadingSyncEvents } = useQuery({
    queryKey: ['syncEvents'],
    queryFn: () => base44.entities.SyncEventLog.list('-created_date', 20)
  });

  // Token expiry countdown
  useEffect(() => {
    if (tokenExpiry) {
      const timer = setInterval(() => {
        const now = new Date();
        const expiry = new Date(tokenExpiry);
        if (now > expiry) {
          setLinkToken(null);
          setTokenExpiry(null);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [tokenExpiry]);

  const generateLinkToken = async () => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('linkGenerate', {
        targetApp: 'HybridCopy'
      });

      setLinkToken(response.data.linkToken);
      setTokenExpiry(response.data.expiresAt);
      toast.success('Link token generated!');
    } catch (error) {
      toast.error('Failed to generate token: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(linkToken);
    toast.success('Token copied to clipboard!');
  };

  const revokeConnection = async (appId) => {
    try {
      await base44.entities.ConnectedApp.update(appId, { status: 'revoked' });
      queryClient.invalidateQueries(['connectedApps']);
      toast.success('Connection revoked');
    } catch (error) {
      toast.error('Failed to revoke: ' + error.message);
    }
  };

  const runDiagnostics = async () => {
    setLoadingDiagnostics(true);
    try {
      const response = await base44.functions.invoke('testHybridCopyLink', {});
      setDiagnostics(response.data);
    } catch (error) {
      toast.error('Failed to run diagnostics: ' + error.message);
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  const timeRemaining = tokenExpiry ? Math.max(0, Math.floor((new Date(tokenExpiry) - new Date()) / 1000)) : 0;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const darkMode = document.documentElement.classList.contains('dark');
  const hybridCopyApps = connectedApps.filter(app =>
    app.app_name === 'HybridCopy'
  );

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
              HybridCopy Integration
            </h1>
            <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-slate-600 mt-1'}>
              Connect HybridCopy to automatically sync your trades
            </p>
          </div>
          <Button
            onClick={runDiagnostics}
            disabled={loadingDiagnostics}
            variant="outline"
            className={darkMode ? 'border-cyan-500/30 hover:bg-cyan-500/10' : ''}
          >
            {loadingDiagnostics ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Activity className="h-4 w-4 mr-2" />
            )}
            Run Diagnostics
          </Button>
        </div>

        {/* Info Banner */}
        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-gradient-to-r from-cyan-50 to-purple-50 border-cyan-200'}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Zap className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <div>
                <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  HybridCopy Integration Features
                </h3>
                <ul className={`text-sm space-y-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Automatic trade sync from HybridCopy
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Secure HMAC-signed webhook authentication
                  </li>
                  <li className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-500" />
                    Real-time account snapshots and signals
                  </li>
                  <li className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-cyan-500" />
                    Idempotent event processing (no duplicates)
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Link Token Generator */}
        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              Connect HybridCopy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Generate a one-time link token to securely connect HybridCopy to your Hybrid Journal account.
              The token expires in 15 minutes.
            </p>

            {!linkToken ? (
              <Button
                onClick={generateLinkToken}
                disabled={generating}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
              >
                {generating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Generate Link Token
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-cyan-900/20 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${darkMode ? 'text-cyan-300' : 'text-cyan-900'}`}>
                      Link Token
                    </span>
                    <Badge variant="outline" className={`text-xs ${darkMode ? 'border-cyan-500/50 text-cyan-300' : ''}`}>
                      <Clock className="h-3 w-3 mr-1" />
                      {minutes}m {seconds}s
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={linkToken}
                      readOnly
                      className={`font-mono text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : ''}`}
                    />
                    <Button size="icon" variant="outline" onClick={copyToken}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className={`rounded-lg p-4 ${darkMode ? 'bg-blue-900/20 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
                  <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                    Next Steps:
                  </p>
                  <ol className={`text-sm space-y-1 list-decimal list-inside ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                    <li>Copy the token above</li>
                    <li>Go to HybridCopy <ArrowRight className="inline h-3 w-3" /> Journal Sync <ArrowRight className="inline h-3 w-3" /> Connect Journal</li>
                    <li>Paste the token and click "Connect"</li>
                    <li>HybridCopy will receive a signing secret for secure communication</li>
                  </ol>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connected Apps */}
        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-white' : ''}>Connected Apps</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingApps ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
              </div>
            ) : hybridCopyApps.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No HybridCopy connections yet</p>
                <p className="text-sm mt-1">Generate a link token above to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hybridCopyApps.map(app => (
                  <div
                    key={app.id}
                    className={`flex items-center justify-between p-4 rounded-lg ${
                      darkMode ? 'bg-slate-900/50 border border-slate-700' : 'border'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded ${
                        app.status === 'active'
                          ? 'bg-green-500/10'
                          : app.status === 'revoked'
                          ? 'bg-red-500/10'
                          : 'bg-yellow-500/10'
                      }`}>
                        {app.status === 'active' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : app.status === 'revoked' ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-500" />
                        )}
                      </div>
                      <div>
                        <p className={`font-bold ${darkMode ? 'text-white' : ''}`}>{app.app_name}</p>
                        <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {app.total_events_received || 0} events received
                          {app.last_event_at && ` • Last: ${new Date(app.last_event_at).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={app.status === 'active' ? 'default' : 'outline'}>
                        {app.status}
                      </Badge>
                      {app.status === 'active' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Revoke this app connection? HybridCopy will no longer be able to sync trades.')) {
                              revokeConnection(app.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync History */}
        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-white' : ''}>Recent Sync Events</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSyncEvents ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
              </div>
            ) : syncEvents.length === 0 ? (
              <p className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                No sync events yet
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {syncEvents.slice(0, 10).map(event => (
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

        {/* Diagnostics Panel */}
        {diagnostics && (
          <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                <Activity className="h-5 w-5 text-cyan-500" />
                Diagnostics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-4 rounded-lg font-mono text-xs overflow-auto max-h-96 ${
                darkMode ? 'bg-slate-900' : 'bg-slate-100'
              }`}>
                <pre className={darkMode ? 'text-slate-300' : 'text-slate-700'}>
                  {JSON.stringify(diagnostics, null, 2)}
                </pre>
              </div>
              {diagnostics.next_steps && (
                <div className={`mt-4 p-4 rounded-lg ${darkMode ? 'bg-cyan-900/20 border border-cyan-500/30' : 'bg-cyan-50 border border-cyan-200'}`}>
                  <p className={`font-medium mb-2 ${darkMode ? 'text-cyan-300' : 'text-cyan-900'}`}>
                    Next Steps:
                  </p>
                  <ul className={`text-sm space-y-1 ${darkMode ? 'text-cyan-200' : 'text-cyan-800'}`}>
                    {diagnostics.next_steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
