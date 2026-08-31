import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plug, Copy, Check, RefreshCw, Loader2, Zap, Brain, Shield, TrendingUp, KeyRound, AlertCircle, ExternalLink } from 'lucide-react';

const AI_CLIENTS = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    blurb: 'OpenAI ChatGPT — connect via its "Connectors / MCP" flow.',
    steps: [
      'Open ChatGPT → Settings → Connectors → Add a new connector / MCP server.',
      'Choose "Add MCP server" and paste the OAuth URL below.',
      'Sign in with your Hybrid Journal account and approve the consent screen.',
      'Ask ChatGPT: "Read my open Kraken positions and analyze my last 20 trades."',
    ],
  },
  {
    id: 'claude',
    name: 'Claude',
    blurb: 'Anthropic Claude — connect via Settings → Connectors / MCP.',
    steps: [
      'Open Claude → Settings → Connectors → Add custom connector.',
      'Paste the OAuth URL below as the MCP server endpoint.',
      'Approve the OAuth consent (opens Hybrid Journal sign-in).',
      'Ask Claude: "Generate today\'s QQE briefing and place a paper BTC long."',
    ],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    blurb: 'Cursor IDE — add the MCP server in Settings → MCP.',
    steps: [
      'Open Cursor → Settings → MCP → Add a new MCP server (HTTP).',
      'Paste the OAuth URL below.',
      'Authenticate through the Hybrid Journal OAuth consent screen.',
      'Use the agent: "Pull my Kraken account status and draft a journal entry."',
    ],
  },
];

export default function Connect() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState(null);

  const darkMode = document.documentElement.classList.contains('dark');

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://hybridjournal.base44.app';
  const oauthUrl = `${origin}/api/mcp`;
  const headlessUrl = `${origin}/functions/hybridMcp`;

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['krakenConnections'],
    queryFn: async () => {
      const all = await base44.entities.BrokerConnection.list('-created_date', 50);
      return all.filter((c) => c.provider === 'Kraken' || c.settings_json?.broker_id === 'kraken');
    },
  });

  const krakenConn = connections[0];

  const { data: openCount = 0 } = useQuery({
    queryKey: ['krakenOpenCount', krakenConn?.id],
    queryFn: async () => {
      if (!krakenConn) return 0;
      const trades = await base44.entities.Trade.filter({ broker_connection_id: krakenConn.id, trade_status: 'open' });
      return (trades || []).length;
    },
    enabled: !!krakenConn,
  });

  const copy = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
    }
  };

  const handleConnectKraken = async (mode) => {
    setError(null);
    setConnecting(true);
    try {
      await base44.entities.BrokerConnection.create({
        provider: 'Kraken',
        mode: 'WEBHOOK_PUSH',
        display_name: `Kraken (${mode})`,
        status: 'connected',
        auto_sync_enabled: true,
        sync_frequency_minutes: 15,
        settings_json: { broker_id: 'kraken', mode },
      });
      queryClient.invalidateQueries(['krakenConnections']);
    } catch (e) {
      setError(e.message || 'Failed to create Kraken connection');
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    setSyncResult(null);
    try {
      const res = await base44.functions.invoke('krakenSyncPull', {});
      setSyncResult(res?.data || res);
      queryClient.invalidateQueries(['krakenOpenCount']);
      queryClient.invalidateQueries(['krakenConnections']);
      queryClient.invalidateQueries(['trades']);
    } catch (e) {
      setError(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const tokenCard = (label, url, key, hint) => (
    <div className={`rounded-xl border p-4 ${darkMode ? 'bg-slate-950/60 border-cyan-500/20' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold uppercase tracking-wide ${darkMode ? 'text-cyan-400/80' : 'text-slate-500'}`}>{label}</span>
        <Button size="sm" variant="outline" onClick={() => copy(key, url)} className="h-7">
          {copied === key ? <Check className="h-3.5 w-3.5 mr-1 text-green-500" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
          {copied === key ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <code className={`block break-all text-sm ${darkMode ? 'text-cyan-300' : 'text-slate-800'}`}>{url}</code>
      {hint && <p className={`text-xs mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{hint}</p>}
    </div>
  );

  const sectionCard = darkMode ? 'bg-slate-950/80 border-cyan-500/20 text-white' : 'bg-white border-slate-200 text-slate-900';

  return (
    <div className={`min-h-screen p-6 transition-colors ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'}`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className={`text-4xl font-bold bg-gradient-to-r ${darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'} bg-clip-text text-transparent`}>
            Connect AI Clients
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-slate-600 mt-1'}>
            Wire ChatGPT, Claude, or Cursor to your Hybrid Journal so their AI can manage trades, read positions, and run analysis on your behalf.
          </p>
        </div>

        {/* Kraken Sync Status */}
        <Card className={sectionCard}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <KeyRound className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              Kraken Auto-Sync
            </CardTitle>
            {krakenConn && (
              <Badge className="bg-green-100 text-green-800">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                Connected · {String(krakenConn.settings_json?.mode || 'paper').toUpperCase()}
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm opacity-70"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : !krakenConn ? (
              <div className={`rounded-lg p-4 ${darkMode ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
                <p className={`text-sm mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  No Kraken connection yet. Connecting creates a Kraken BrokerConnection and turns on automatic position sync (every 15 min) plus the closed-trade webhook. No Kraken API keys needed — sync runs through your Hybrid Execution gateway.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => handleConnectKraken('paper')} disabled={connecting}>
                    {connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                    Connect Kraken (Paper)
                  </Button>
                  <Button variant="outline" onClick={() => handleConnectKraken('live')} disabled={connecting}>
                    Connect Kraken (Live)
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className={`text-xs uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Last sync</div>
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {krakenConn.last_sync_at ? new Date(krakenConn.last_sync_at).toLocaleString() : 'Never'}
                    </div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Open positions</div>
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{openCount}</div>
                  </div>
                  <div>
                    <div className={`text-xs uppercase ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Auto-sync</div>
                    <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {krakenConn.auto_sync_enabled ? `Every ${krakenConn.sync_frequency_minutes || 15} min` : 'Off'}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={handleSyncNow} disabled={syncing}>
                    {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Sync now
                  </Button>
                  {syncResult && (
                    <span className={`text-xs ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                      Synced {syncResult.results?.length || 0} connection(s)
                      {syncResult.results?.[0] ? ` — ${syncResult.results[0].created} created, ${syncResult.results[0].updated} updated, ${syncResult.results[0].closed} closed` : ''}
                    </span>
                  )}
                </div>
                <div className={`rounded-lg p-3 text-xs ${darkMode ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                  <strong>Webhook (for closed trades):</strong> point your Render gateway to{' '}
                  <code className="break-all">{origin}/functions/krakenWebhook</code> with header{' '}
                  <code>Authorization: Bearer &lt;KRAKEN_WEBHOOK_TOKEN&gt;</code>
                </div>
              </>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-500"><AlertCircle className="h-4 w-4" />{error}</div>
            )}
          </CardContent>
        </Card>

        {/* What the AI can do */}
        <Card className={sectionCard}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className={`h-5 w-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
              What a connected AI can do
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { icon: Zap, text: 'Place paper or live Kraken trades from plain English ("Buy 0.001 BTC at market, stop 65000").' },
                { icon: TrendingUp, text: 'Read your open positions and account status across Kraken and cTrader.' },
                { icon: Brain, text: 'Generate a daily QQE briefing and run the market cause/regime engine.' },
                { icon: Shield, text: 'Analyze your trade history, journals, and signals — read-only on your data.' },
              ].map((c, i) => {
                const Icon = c.icon;
                return (
                  <div key={i} className={`flex items-start gap-3 rounded-lg p-3 ${darkMode ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                    <span className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{c.text}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Connect tabs */}
        <Card className={sectionCard}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              Connect an AI client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="chatgpt">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="chatgpt">ChatGPT</TabsTrigger>
                <TabsTrigger value="claude">Claude</TabsTrigger>
                <TabsTrigger value="cursor">Cursor</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>

              {AI_CLIENTS.map((c) => (
                <TabsContent key={c.id} value={c.id} className="space-y-4">
                  <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{c.blurb}</p>
                  {tokenCard('MCP server URL (OAuth)', oauthUrl, `${c.id}-oauth`)}
                  <ol className={`space-y-2 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {c.steps.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${darkMode ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>{i + 1}</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ol>
                </TabsContent>
              ))}

              <TabsContent value="custom" className="space-y-4">
                <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  For headless server-to-server clients (your Render services, scripts, custom integrations), use the token-authenticated MCP endpoint. No OAuth browser flow — just JSON-RPC 2.0 over HTTP.
                </p>
                {tokenCard('Headless MCP URL', headlessUrl, 'custom-headless', 'POST JSON-RPC: initialize → tools/list → tools/call')}
                {tokenCard('Authorization header', 'Authorization: Bearer <HYBRID_JOURNAL_MCP_TOKEN>', 'custom-token', 'The MCP token is set as an app secret. Reveal/copy it from Settings → Secrets.')}
                <div className={`rounded-lg p-3 text-xs ${darkMode ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                  Tools exposed: <code>place_trade</code>, <code>get_positions</code>, <code>get_account_status</code>, <code>get_recent_trades</code>.
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className={`text-center text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          <ExternalLink className="inline h-3 w-3 mr-1" />
          The OAuth MCP server at <code>/api/mcp</code> also exposes every journal entity and the QQE, market-cause, and analysis tools — automatically.
        </p>
      </div>
    </div>
  );
}