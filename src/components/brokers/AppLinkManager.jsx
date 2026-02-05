import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Link2, Copy, CheckCircle2, Clock, AlertCircle, Trash2, RefreshCw, Zap, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AppLinkManager() {
  const [connectedApps, setConnectedApps] = useState([]);
  const [linkToken, setLinkToken] = useState(null);
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [testing, setTesting] = useState(null); // holds app id being tested
  const [refreshing, setRefreshing] = useState(false);
  const [waitingForConnection, setWaitingForConnection] = useState(false);

  const darkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    loadConnectedApps();
  }, []);

  // Auto-refresh when waiting for connection
  useEffect(() => {
    if (waitingForConnection && linkToken) {
      const interval = setInterval(() => {
        loadConnectedApps();
      }, 3000); // Check every 3 seconds
      return () => clearInterval(interval);
    }
  }, [waitingForConnection, linkToken]);

  // Check if new connection appeared
  useEffect(() => {
    if (waitingForConnection && connectedApps.some(app => app.status === 'active')) {
      setWaitingForConnection(false);
      setLinkToken(null);
      setTokenExpiry(null);
      toast.success('Connection established! HybridCopy is now linked.');
    }
  }, [connectedApps, waitingForConnection]);

  useEffect(() => {
    if (tokenExpiry) {
      const timer = setInterval(() => {
        const now = new Date();
        const expiry = new Date(tokenExpiry);
        if (now > expiry) {
          setLinkToken(null);
          setTokenExpiry(null);
          setWaitingForConnection(false);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [tokenExpiry]);

  const loadConnectedApps = async () => {
    try {
      // Use the function since ConnectedApps are created by service role
      const response = await base44.functions.invoke('getConnectedApps', {});
      if (response.data?.success) {
        setConnectedApps(response.data.apps || []);
      } else {
        // Fallback to direct list
        const apps = await base44.entities.ConnectedApp.list();
        setConnectedApps(apps);
      }
    } catch (error) {
      console.error('Failed to load connected apps:', error);
      // Fallback to direct list
      try {
        const apps = await base44.entities.ConnectedApp.list();
        setConnectedApps(apps);
      } catch (e) {
        console.error('Fallback also failed:', e);
      }
    }
  };

  const generateLinkToken = async () => {
    setGenerating(true);
    try {
      const response = await base44.functions.invoke('linkGenerate', {
        targetApp: 'HybridCopy'
      });

      setLinkToken(response.data.linkToken);
      setTokenExpiry(response.data.expiresAt);
      setWaitingForConnection(true);
      toast.success('Link token generated! Paste it in HybridCopy to connect.');
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

  const refreshConnections = async () => {
    setRefreshing(true);
    await loadConnectedApps();
    setRefreshing(false);
    toast.success('Connections refreshed');
  };

  const testConnection = async (app) => {
    setTesting(app.id);
    try {
      const response = await base44.functions.invoke('testHybridCopyLink', {
        app_id: app.id
      });

      if (response.data?.success) {
        toast.success(`Connection test successful! ${app.app_name} is working.`);
      } else {
        toast.error(response.data?.error || 'Connection test failed');
      }
    } catch (error) {
      toast.error('Test failed: ' + error.message);
    } finally {
      setTesting(null);
    }
  };

  const revokeConnection = async (appId) => {
    try {
      await base44.entities.ConnectedApp.update(appId, { status: 'revoked' });
      loadConnectedApps();
      toast.success('Connection revoked');
    } catch (error) {
      toast.error('Failed to revoke: ' + error.message);
    }
  };

  const timeRemaining = tokenExpiry ? Math.max(0, Math.floor((new Date(tokenExpiry) - new Date()) / 1000)) : 0;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const activeApps = connectedApps.filter(app => app.status === 'active');

  return (
    <div className="space-y-6">
      {/* Connection Status Banner */}
      {activeApps.length > 0 && (
        <div className={`p-4 rounded-lg border ${
          darkMode
            ? 'bg-green-900/20 border-green-500/30'
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <div>
              <p className={`font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                Connected to {activeApps.map(a => a.app_name).join(', ')}
              </p>
              <p className={`text-sm ${darkMode ? 'text-green-300/70' : 'text-green-600'}`}>
                {activeApps.reduce((sum, a) => sum + (a.total_events_received || 0), 0)} events synced
              </p>
            </div>
          </div>
        </div>
      )}

      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : ''}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
            <Link2 className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
            Link HybridCopy
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
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Link Token
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className={`p-4 rounded-lg border ${
                darkMode
                  ? 'bg-cyan-900/20 border-cyan-500/30'
                  : 'bg-cyan-50 border-cyan-200'
              }`}>
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
                    className={`font-mono text-sm ${darkMode ? 'bg-slate-900 border-slate-700 text-white' : ''}`}
                  />
                  <Button size="icon" variant="outline" onClick={copyToken} className={darkMode ? 'border-slate-600' : ''}>
                    <Copy className={`h-4 w-4 ${darkMode ? 'text-cyan-400' : ''}`} />
                  </Button>
                </div>
              </div>

              {waitingForConnection && (
                <div className={`p-3 rounded-lg flex items-center gap-3 ${
                  darkMode ? 'bg-yellow-900/20 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <RefreshCw className={`h-4 w-4 animate-spin ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                  <span className={`text-sm ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
                    Waiting for connection... Paste the token in HybridCopy
                  </span>
                </div>
              )}

              <div className={`rounded-lg p-4 border ${
                darkMode
                  ? 'bg-blue-900/20 border-blue-500/30'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                  Next Steps:
                </p>
                <ol className={`text-sm space-y-1 list-decimal list-inside ${darkMode ? 'text-blue-200' : 'text-blue-800'}`}>
                  <li>Copy the token above</li>
                  <li>Go to HybridCopy → Settings → Connect Journal</li>
                  <li>Paste the token and click "Connect"</li>
                  <li>This page will automatically update when connected</li>
                </ol>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : ''}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className={darkMode ? 'text-white' : ''}>Connected Apps</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshConnections}
            disabled={refreshing}
            className={darkMode ? 'border-slate-600' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {connectedApps.length === 0 ? (
            <div className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No apps connected yet</p>
              <p className="text-sm mt-1">Generate a link token above to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedApps.map(app => (
                <div
                  key={app.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    darkMode ? 'bg-slate-900/50 border-slate-700' : 'border-slate-200'
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
                      <p className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {app.app_name}
                      </p>
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
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => testConnection(app)}
                          disabled={testing === app.id}
                          className={darkMode ? 'border-cyan-500/30 hover:bg-cyan-500/10' : ''}
                        >
                          {testing === app.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          <span className="ml-1 text-xs">Test</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('Revoke this app connection?')) {
                              revokeConnection(app.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
