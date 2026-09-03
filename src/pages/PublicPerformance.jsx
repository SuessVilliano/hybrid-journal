import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Link2, RefreshCw, Trash2, Database, ShieldCheck, ExternalLink, Plus, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

const TEST_FIXTURES = [
  {
    label: 'Hybrid Funding — Forex $5K',
    url: 'https://hybridfundingdashboard.propaccount.com/public-overview/83db3117-30c4-434d-819c-df35d1d3b470'
  },
  {
    label: 'Hybrid Funding — Futures',
    url: 'https://hybridfundingdashboard.propaccount.com/public-overview/36240f5d-bf00-4e91-ab41-f8604e1e8776'
  }
];

function pct(value) {
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : '—';
}

function money(value) {
  return Number.isFinite(Number(value)) ? `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '—';
}

export default function PublicPerformance() {
  const queryClient = useQueryClient();
  const [url, setUrl] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [syncingId, setSyncingId] = useState(null);
  const darkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ['publicPerformanceSources'],
    queryFn: () => base44.entities.PublicPerformanceSource.list('-created_date', 100)
  });

  const connectMutation = useMutation({
    mutationFn: async ({ inputUrl, name }) => {
      const res = await base44.functions.invoke('syncPublicPerformance', { url: inputUrl });
      const data = res?.data || res;
      if (!data?.success) throw new Error(data?.error || 'Could not connect public performance URL');
      if (name && data.source?.id) {
        await base44.entities.PublicPerformanceSource.update(data.source.id, { display_name: name });
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['publicPerformanceSources'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      setUrl('');
      setDisplayName('');
      toast.success(`Connected ${data.provider} — ${data.imported || 0} trades imported`);
    },
    onError: (error) => toast.error(error.message)
  });

  const handleConnect = (fixture = null) => {
    const inputUrl = fixture?.url || url.trim();
    const name = fixture?.label || displayName.trim();
    if (!inputUrl) return toast.error('Paste a public performance URL first');
    connectMutation.mutate({ inputUrl, name });
  };

  const syncSource = async (source) => {
    setSyncingId(source.id);
    try {
      const res = await base44.functions.invoke('syncPublicPerformance', { source_id: source.id });
      const data = res?.data || res;
      if (!data?.success) throw new Error(data?.error || 'Sync failed');
      queryClient.invalidateQueries({ queryKey: ['publicPerformanceSources'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      toast.success(`${source.display_name || source.provider} synced — ${data.imported || 0} new trades`);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSyncingId(null);
    }
  };

  const removeSource = async (source) => {
    if (!window.confirm('Remove this public performance source? Imported journal trades will remain.')) return;
    try {
      await base44.entities.PublicPerformanceSource.delete(source.id);
      queryClient.invalidateQueries({ queryKey: ['publicPerformanceSources'] });
      toast.success('Public performance source removed');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const totalImported = useMemo(
    () => sources.reduce((sum, source) => sum + Number(source.last_snapshot?.trade_rows_found || 0), 0),
    [sources]
  );

  const cardClass = darkMode ? 'bg-slate-950/80 border-cyan-500/20 text-white' : 'bg-white border-slate-200 text-slate-900';

  return (
    <div className={`min-h-screen p-4 md:p-6 ${darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'}`}>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Link2 className="h-7 w-7 text-cyan-400" />
            <h1 className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
              Public Performance URLs
            </h1>
          </div>
          <p className={`mt-2 max-w-3xl ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Paste a supported public trading dashboard. Hybrid Journal detects the provider, looks for structured account/trade data, normalizes it into the journal, and keeps the evidence source attached to the account history.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Connected sources" value={sources.length} icon={Link2} darkMode={darkMode} />
          <SummaryCard label="Trade rows detected" value={totalImported} icon={Database} darkMode={darkMode} />
          <SummaryCard label="Trust rule" value="Evidence first" icon={ShieldCheck} darkMode={darkMode} compact />
        </div>

        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-cyan-400" /> Add a public performance source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Account label (optional)" />
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://... public performance URL" />
              <Button onClick={() => handleConnect()} disabled={connectMutation.isPending} className="bg-gradient-to-r from-cyan-500 to-purple-600">
                {connectMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                Connect & analyze
              </Button>
            </div>

            <div className={`rounded-xl border p-4 ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50'}`}>
              <div className="mb-3 text-sm font-semibold">Your Hybrid Funding test accounts</div>
              <div className="grid gap-3 md:grid-cols-2">
                {TEST_FIXTURES.map((fixture) => (
                  <button
                    type="button"
                    key={fixture.url}
                    onClick={() => handleConnect(fixture)}
                    disabled={connectMutation.isPending}
                    className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 ${darkMode ? 'border-cyan-500/20 bg-slate-950/60 hover:border-cyan-500/50' : 'border-cyan-200 bg-white hover:border-cyan-400'}`}
                  >
                    <div className="font-semibold">{fixture.label}</div>
                    <div className={`mt-1 break-all text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>{fixture.url}</div>
                    <div className="mt-3 text-xs font-medium text-cyan-400">Connect this dashboard →</div>
                  </button>
                ))}
              </div>
            </div>

            <div className={`flex gap-2 rounded-lg p-3 text-xs ${darkMode ? 'bg-cyan-500/5 text-slate-400' : 'bg-cyan-50 text-slate-600'}`}>
              <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-500" />
              A public URL is not automatically marked broker-verified. Hybrid upgrades trust only when the source exposes structured evidence that supports a stronger classification.
            </div>
          </CardContent>
        </Card>

        <Card className={cardClass}>
          <CardHeader><CardTitle>Connected public sources</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-cyan-400" /></div>
            ) : sources.length === 0 ? (
              <div className={`rounded-xl border border-dashed p-10 text-center ${darkMode ? 'border-slate-800 text-slate-500' : 'border-slate-300 text-slate-500'}`}>
                No public performance URLs connected yet.
              </div>
            ) : (
              <div className="space-y-4">
                {sources.map((source) => <SourceCard key={source.id} source={source} darkMode={darkMode} syncing={syncingId === source.id} onSync={() => syncSource(source)} onDelete={() => removeSource(source)} />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, darkMode, compact = false }) {
  return (
    <Card className={darkMode ? 'bg-slate-950/70 border-cyan-500/20' : 'bg-white/90 border-cyan-200'}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">{label}</div>
            <div className={`${compact ? 'text-lg' : 'text-2xl'} mt-1 font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}</div>
          </div>
          <Icon className="h-5 w-5 text-cyan-400" />
        </div>
      </CardContent>
    </Card>
  );
}

function SourceCard({ source, darkMode, syncing, onSync, onDelete }) {
  const snap = source.last_snapshot || {};
  const statusGood = source.status === 'connected';
  const trustLabel = source.trust_level === 'verified_broker_feed'
    ? 'Verified broker feed'
    : source.trust_level === 'structured_public_feed'
      ? 'Structured public feed'
      : 'Public report';

  return (
    <div className={`rounded-2xl border p-4 ${darkMode ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{source.display_name || source.provider || 'Public performance source'}</div>
            <Badge variant="outline" className={statusGood ? 'border-emerald-500/30 text-emerald-400' : 'border-amber-500/30 text-amber-400'}>
              {statusGood ? <CheckCircle2 className="mr-1 h-3 w-3" /> : <AlertTriangle className="mr-1 h-3 w-3" />}{source.status}
            </Badge>
            <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">{trustLabel}</Badge>
          </div>
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="mt-1 flex max-w-full items-center gap-1 break-all text-xs text-cyan-500 hover:underline">
            {source.url} <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </a>
          <div className={`mt-2 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            Provider: {source.provider || 'unknown'} · Account ID: {source.provider_account_id || 'not detected'} · Last sync: {source.last_sync ? new Date(source.last_sync).toLocaleString() : 'never'}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSync} disabled={syncing}>
            {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Sync
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete} className="text-rose-400"><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-6">
        <Metric label="Balance" value={money(snap.balance)} darkMode={darkMode} />
        <Metric label="Equity" value={money(snap.equity)} darkMode={darkMode} />
        <Metric label="P&L" value={money(snap.pnl)} darkMode={darkMode} />
        <Metric label="Drawdown" value={pct(snap.drawdown)} darkMode={darkMode} />
        <Metric label="Win rate" value={pct(snap.win_rate)} darkMode={darkMode} />
        <Metric label="Trade rows" value={snap.trade_rows_found ?? '—'} darkMode={darkMode} />
      </div>

      <div className={`mt-3 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
        Structured objects: {snap.structured_objects_found ?? 0} · Candidate endpoints: {snap.candidate_endpoints_found ?? 0}
      </div>
    </div>
  );
}

function Metric({ label, value, darkMode }) {
  return (
    <div className={`rounded-xl border p-3 ${darkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-white'}`}>
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}
