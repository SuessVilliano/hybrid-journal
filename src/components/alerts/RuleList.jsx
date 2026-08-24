import React from 'react';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Play, ChevronUp, ChevronDown } from 'lucide-react';

export default function RuleList({ rules, onEdit, onDelete, onToggle, onMove, onTest, darkMode }) {
  const card = darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30';
  if (rules.length === 0) {
    return (
      <div className={`p-6 rounded-xl border text-center text-sm ${card} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        No rules yet. Rules are evaluated top-to-bottom; the first match wins. Add a rule with no filters for a default alert.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {rules.map((r, i) => (
        <div key={r.id} className={`flex items-start gap-3 p-3 rounded-xl border ${card} ${!r.enabled ? 'opacity-50' : ''}`}>
          <div className="flex flex-col">
            <button onClick={() => onMove(r, 'up')} disabled={i === 0} className="disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
            <button onClick={() => onMove(r, 'down')} disabled={i === rules.length - 1} className="disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">{r.name}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${r.enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                {r.enabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {[
                r.symbols?.length && `symbols: ${r.symbols.join(',')}`,
                r.actions?.length && `actions: ${r.actions.join(',')}`,
                r.priorities?.length && `priority: ${r.priorities.join(',')}`,
                r.min_confidence > 0 && `conf≥${r.min_confidence}`,
                r.keywords?.length && `kw: ${r.keywords.join(',')}`
              ].filter(Boolean).join(' · ') || 'catch-all (matches everything)'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => onTest(r)} title="Test"><Play className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => onToggle(r)} title="Toggle">
              <input type="checkbox" checked={!!r.enabled} readOnly className="pointer-events-none" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onEdit(r)}><Pencil className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(r)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}