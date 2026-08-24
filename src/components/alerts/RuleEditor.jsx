import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';

const empty = {
  name: '', keywords: '', keyword_mode: 'any', symbols: '', actions: [],
  priorities: [], min_confidence: 0, sound_id: '', voice_mode: 'off',
  speak_mode: 'message', speak_template: '', repeat: 1, volume: 100, flash: false
};

export default function RuleEditor({ initial, sounds, onSave, onCancel, darkMode }) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setForm({
        ...empty,
        ...initial,
        keywords: (initial.keywords || []).join(', '),
        symbols: (initial.symbols || []).join(', ')
      });
    } else {
      setForm(empty);
    }
  }, [initial]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleArr = (k, v) => setForm(f => {
    const arr = f[k] || [];
    return { ...f, [k]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] };
  });

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        ...form,
        keywords: form.keywords.split(',').map(s => s.trim()).filter(Boolean),
        symbols: form.symbols.split(',').map(s => s.trim().toUpperCase()).filter(Boolean),
        min_confidence: Number(form.min_confidence) || 0,
        repeat: Number(form.repeat) || 1,
        volume: Number(form.volume) || 100
      });
    } finally { setSaving(false); }
  };

  const chip = (active) => active
    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white border-transparent'
    : darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-600';

  return (
    <div className={`p-4 rounded-xl border space-y-4 ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
      <div>
        <Label>Rule name</Label>
        <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Critical Hybrid AI sell" className="mt-1" />
      </div>

      <div>
        <Label>Keywords (comma-separated)</Label>
        <Input value={form.keywords} onChange={e => set('keywords', e.target.value)} placeholder="hybrid ai, sell" className="mt-1" />
        <div className="flex gap-2 mt-2">
          {['any', 'all'].map(m => (
            <button key={m} onClick={() => set('keyword_mode', m)} className={`px-3 py-1 rounded-lg text-xs border ${chip(form.keyword_mode === m)}`}>
              Match {m}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Symbols (blank = any, comma-separated)</Label>
        <Input value={form.symbols} onChange={e => set('symbols', e.target.value)} placeholder="MNQ, NQ1, BTCUSD" className="mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Actions</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {['BUY', 'SELL', 'CLOSE'].map(a => (
              <button key={a} onClick={() => toggleArr('actions', a)} className={`px-3 py-1 rounded-lg text-xs border ${chip(form.actions.includes(a))}`}>{a}</button>
            ))}
          </div>
        </div>
        <div>
          <Label>Priorities</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {['critical', 'high', 'normal', 'low'].map(p => (
              <button key={p} onClick={() => toggleArr('priorities', p)} className={`px-3 py-1 rounded-lg text-xs border capitalize ${chip(form.priorities.includes(p))}`}>{p}</button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <Label>Min confidence %</Label>
        <Input type="number" min="0" max="100" value={form.min_confidence} onChange={e => set('min_confidence', e.target.value)} className="mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Play sound</Label>
          <select value={form.sound_id} onChange={e => set('sound_id', e.target.value)} className="mt-1 w-full h-9 rounded-md border bg-transparent px-2 text-sm">
            <option value="">None</option>
            {sounds.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <Label>Voice</Label>
          <select value={form.voice_mode} onChange={e => set('voice_mode', e.target.value)} className="mt-1 w-full h-9 rounded-md border bg-transparent px-2 text-sm">
            <option value="off">Off</option>
            <option value="browser">Browser voice</option>
            <option value="ai">AI voice (Kokoro)</option>
          </select>
        </div>
      </div>

      <div>
        <Label>What the voice says</Label>
        <select value={form.speak_mode} onChange={e => set('speak_mode', e.target.value)} className="mt-1 w-full h-9 rounded-md border bg-transparent px-2 text-sm">
          <option value="message">The alert message</option>
          <option value="template">Custom template</option>
        </select>
        {form.speak_mode === 'template' && (
          <Input value={form.speak_template} onChange={e => set('speak_template', e.target.value)} placeholder="{action} signal on {symbol}, {tf} setup" className="mt-2" />
        )}
        <p className={`text-[11px] mt-1 ${darkMode ? 'text-cyan-400/60' : 'text-cyan-700/60'}`}>Placeholders: {'{action} {symbol} {tf} {priority} {confidence} {price} {message} {provider}'}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Repeat ×</Label>
          <Input type="number" min="1" max="10" value={form.repeat} onChange={e => set('repeat', e.target.value)} className="mt-1" />
        </div>
        <div>
          <Label>Volume %</Label>
          <Input type="number" min="5" max="100" value={form.volume} onChange={e => set('volume', e.target.value)} className="mt-1" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={!!form.flash} onChange={e => set('flash', e.target.checked)} />
        Flash screen on match
      </label>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={saving || !form.name} className="bg-gradient-to-r from-cyan-500 to-purple-600">
          <Save className="h-4 w-4 mr-1" /> Save rule
        </Button>
        <Button onClick={onCancel} variant="ghost"><X className="h-4 w-4 mr-1" /> Cancel</Button>
      </div>
    </div>
  );
}