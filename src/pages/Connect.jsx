import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plug, Copy, Check, RefreshCw, Loader2, Zap, Brain, Shield, TrendingUp, AlertCircle, ExternalLink, Plus, Link as LinkIcon, KeyRound } from 'lucide-react';
import BrokerConnectionForm from '@/components/brokers/BrokerConnectionForm';
import BrokerConnectionCard from '@/components/brokers/BrokerConnectionCard';
import AutoSyncManager from '@/components/brokers/AutoSyncManager';
import { syncBrokerTrades } from '@/components/brokers/brokerAPIHelper';

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

const isKraken = (c) =>
  c?.broker_id === 'kraken' || c?.provider === 'Kraken' || c?.settings_json?.broker_id === 'kraken';

export default function Connect() {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);

  const darkMode = document.documentElement.classList.contains('dark');

  const origin = 'https://hybridjournal.base44.app';
  const oauthUrl = `${origin}/api/mcp`;
  const headlessUrl = `${origin}/functions/hybridMcp`;

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ['brokerConnections'],
    queryFn: () => base44.entities.BrokerConnection.list('-created_date', 100),
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

  const handleSubmit = async (data) => {
    try {
      if (editingConnection) {
        await base44.entities.BrokerConnection.update(editingConnection.id, data);
        toast.success('Connection updated');
      } else {
        await base44.entities.BrokerConnection.create(data);
        toast.success('Connection added');
      }
      queryClient.invalidateQueries(['brokerConnections']);
      setShowForm(false);
      setEditingConnection(null);
    } catch (e) {
      toast.error(`Failed to save connection: ${e.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Disconnect this broker? Already-synced trades stay in your journal.')) return;
    try {
      await base44.entities.BrokerConnection.delete(id);
      queryClient.invalidateQueries(['brokerConnections']);
      toast.success('Connection removed');
    } catch (e) {
      toast.error(`Failed to remove: ${e.message}`);
    }
  };

  const handleSync = async (connection) => {
    try {
      if (isKraken(connection)) {
        const res = await base44.functions.invoke('krakenSyncPull', {});
        const data = res?.data || res;
        const r = data?.results?.[0];
        if (r?.error) {
          toast.error(`Kraken sync failed: ${r.error}`);
        } else {
          // Kraken positions sync via the gateway; keep last_sync current for the card
          await base44.entities.BrokerConnection.update(connection.id, {
            last_sync: new Date().toISOString(),
            status: 'connected',
          }).catch(() => {});
          toast.success(`Kraken synced${r ? ` — ${r.created || 0} new, ${r.updated || 0} updated, ${r.closed || 0} closed` : ''}`);
        }
      } else {
        const result = await syncBrokerTrades(connection);
        await base44.entities.BrokerConnection.update(connection.id, {
          last_sync: new Date().toISOString(),
          account_balance: result.account_balance,
          account_equity: result.account_equity,
          status: 'connected',
        }).catch(() => {});
        toast.success(`${connection.broker_name || connection.display_name || 'Broker'} synced — ${result.imported || 0} new, ${result.skipped || 0} skipped`);
      }
      queryClient.invalidateQueries(['brokerConnections']);
      queryClient.invalidateQueries(['trades']);
    } catch (e) {
      toast.error(`Sync failed: ${e.message}`);
      try {
        await base44.entities.BrokerConnection.update(connection.id, { status: 'error', error_message: e.message });
      } catch {}
      queryClient.invalidateQueries(['brokerConnections']);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      await base44.functions.invoke('onLoginSync', {});
      queryClient.invalidateQueries(['brokerConnections']);
      queryClient.invalidateQueries(['trades']);
      toast.success('Synced all connected accounts');
    } catch (e) {
      toast.error(`Sync all failed: ${e.message}`);
    } finally {
      setSyncingAll(false);
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
  const krakenConn = connections.find(isKraken);

  return (
    <div className={`min-h-screen p-6 transition-colors ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'}`}>
      <AutoSyncManager />
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className={`text-4xl font-bold bg-gradient-to-r ${darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'} bg-clip-text text-transparent`}>
            Connections
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-slate-600 mt-1'}>
            One home for everything wired into your Hybrid Journal — AI clients (ChatGPT, Claude, Cursor) and your broker accounts (Kraken, cTrader, DXTrade, and more).
          </p>
        </div>

        {/* Connect an AI client */}
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

        {/* Broker connections */}
        <Card className={sectionCard}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              Broker connections
            </CardTitle>
            <div className="flex gap-2">
              {connections.length > 0 && (
                <Button variant="outline" onClick={handleSyncAll} disabled={syncingAll} className={darkMode ? 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}>
                  {syncingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Sync all
                </Button>
              )}
              <Button onClick={() => { setEditingConnection(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add broker
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Kraken-specific hint */}
            <div className={`rounded-lg p-3 text-sm flex items-start gap-2 ${darkMode ? 'bg-slate-900/60 text-slate-300' : 'bg-slate-50 text-slate-700'}`}>
              <KeyRound className={`h-4 w-4 mt-0.5 flex-shrink-0 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <div>
                <strong>Kraken:</strong> Kraken has no "log in with Kraken" OAuth — it uses API keys you generate in your account. Choose <strong>Add broker → Kraken</strong>, paste a <strong>read-only</strong> API key + private key (Kraken → Security → API), and hit <strong>Test connection</strong>. We validate it live against Kraken and show your real balance/equity. Open-position sync runs through your Hybrid Execution gateway; closed trades arrive via the webhook below.
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className={`h-8 w-8 animate-spin ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              </div>
            ) : connections.length === 0 ? (
              <div className={`rounded-lg p-10 text-center ${darkMode ? 'bg-slate-900/60' : 'bg-slate-50'}`}>
                <LinkIcon className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                <h3 className={`text-lg font-semibold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>No broker connections yet</h3>
                <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Connect Kraken, cTrader, DXTrade, and more — trades sync into your journal automatically.</p>
                <Button onClick={() => { setEditingConnection(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Connect your first broker
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {connections.map((connection) => (
                  <BrokerConnectionCard
                    key={connection.id}
                    connection={connection}
                    onEdit={(conn) => { setEditingConnection(conn); setShowForm(true); }}
                    onDelete={handleDelete}
                    onSync={handleSync}
                  />
                ))}
              </div>
            )}

            {krakenConn && (
              <div className={`rounded-lg p-3 text-xs ${darkMode ? 'bg-slate-900/60 text-slate-400' : 'bg-slate-50 text-slate-600'}`}>
                <strong>Kraken closed-trade webhook:</strong> point your Render gateway to{' '}
                <code className="break-all">{origin}/functions/krakenWebhook</code> with header{' '}
                <code>Authorization: Bearer &lt;KRAKEN_WEBHOOK_TOKEN&gt;</code>
              </div>
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

        <p className={`text-center text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          <ExternalLink className="inline h-3 w-3 mr-1" />
          The OAuth MCP server at <code>/api/mcp</code> also exposes every journal entity and the QQE, market-cause, and analysis tools — automatically.
        </p>
      </div>

      {showForm && (
        <BrokerConnectionForm
          connection={editingConnection}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingConnection(null); }}
        />
      )}
    </div>
  );
}