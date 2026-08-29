import React, { useState } from 'react';
import { Mic, ShieldCheck, Target } from 'lucide-react';
import { HybridExecutionClient, listenForTradeCommand, speechRecognitionSupported, tradeReadback } from '@/lib/hybrid-execution';
import { Button } from '@/components/ui/button';

const execution = new HybridExecutionClient();

export default function HybridExecutionPanel({ onExecuted }) {
  const [text, setText] = useState('');
  const [mode, setMode] = useState('paper');
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function run(fn) {
    setBusy(true); setError('');
    try { await fn(); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function buildPreview() {
    const parsed = await execution.parse(text, { broker: 'kraken', mode, source: 'hybrid-journal' });
    const checked = await execution.preview(parsed.intent);
    setPreview(checked.preview); setResult(null); setConfirmed(false);
  }

  async function listen() {
    if (!speechRecognitionSupported()) throw new Error('Speech recognition is unavailable in this browser');
    const transcript = await listenForTradeCommand();
    setText(transcript); setPreview(null); setResult(null); setConfirmed(false);
  }

  async function execute() {
    const response = mode === 'paper' ? await execution.paperExecute(preview) : await execution.liveExecute(preview);
    setResult(response);
    onExecuted?.(response);
  }

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-slate-950/80 p-5 shadow-lg backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-400"><ShieldCheck className="h-4 w-4" /> Hybrid Execution</div>
          <h2 className="mt-1 text-xl font-bold text-white">Text / Talk to Trade</h2>
          <p className="mt-1 text-sm text-slate-400">Preview a Kraken intent, execute paper or explicitly confirm live, then keep the result beside your journal history.</p>
        </div>
        <select value={mode} onChange={e => { setMode(e.target.value); setPreview(null); setResult(null); setConfirmed(false); }} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"><option value="paper">Kraken Paper</option><option value="live">Kraken Live</option></select>
      </div>
      {error && <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      <div className="mt-4 flex gap-2">
        <textarea value={text} onChange={e => { setText(e.target.value); setPreview(null); setResult(null); setConfirmed(false); }} rows={2} placeholder="Buy $500 of Bitcoin on Kraken" className="flex-1 rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-white outline-none focus:border-cyan-500" />
        <Button variant="outline" onClick={() => run(listen)} disabled={busy} title="Talk to trade"><Mic className="h-4 w-4" /></Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button onClick={() => run(buildPreview)} disabled={busy || !text.trim()} className="bg-gradient-to-r from-cyan-500 to-purple-600"><Target className="mr-2 h-4 w-4" /> Preview</Button>
        {preview && mode === 'live' && <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> I reviewed this exact intent.</label>}
        {preview && <Button onClick={() => run(execute)} disabled={busy || (mode === 'live' && !confirmed)} variant={mode === 'live' ? 'destructive' : 'default'}>{mode === 'live' ? 'Execute live' : 'Execute paper'}</Button>}
      </div>
      {preview && <div className="mt-4 rounded-lg border border-slate-700 bg-black/30 p-3"><div className="text-xs uppercase tracking-wider text-slate-500">Exact preview</div><div className="mt-1 font-mono text-sm text-cyan-200">{tradeReadback(preview)}</div><pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap text-xs text-slate-500">{JSON.stringify(preview, null, 2)}</pre></div>}
      {result && <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"><div className="text-sm font-semibold text-emerald-300">Execution result</div><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-400">{JSON.stringify(result, null, 2)}</pre></div>}
    </div>
  );
}
