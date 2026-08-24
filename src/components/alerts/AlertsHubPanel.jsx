import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Plus, StopCircle, Zap } from 'lucide-react';
import SoundLibrary from '@/components/alerts/SoundLibrary';
import RuleEditor from '@/components/alerts/RuleEditor';
import RuleList from '@/components/alerts/RuleList';

export default function AlertsHubPanel({ darkMode, user, sounds, soundsApi, rules, rulesApi, playback }) {
  const [section, setSection] = useState('rules'); // 'rules' | 'sounds'
  const [editing, setEditing] = useState(null);   // rule object or 'new'
  const card = darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30';

  const handleSave = async (rule) => {
    if (editing === 'new') await rulesApi.addRule(rule);
    else await rulesApi.updateRule(editing.id, rule);
    setEditing(null);
  };

  const testRule = (rule) => {
    playback.playForSignal({
      symbol: rule.symbols?.[0] || 'MNQ',
      action: rule.actions?.[0] || 'SELL',
      provider: rule.providers?.[0] || 'Hybrid Ai',
      priority: rule.priorities?.[0] || 'critical',
      confidence: rule.min_confidence || 90,
      notes: (rule.keywords?.[0] || 'Hybrid AI sell signal') + ' on the 10 minute setup',
      strategy: '',
      timeframe: '10'
    });
  };

  return (
    <div className="space-y-4">
      {/* Audio unlock banner */}
      {!playback.unlocked ? (
        <div className={`p-4 rounded-xl border flex items-center justify-between ${card}`}>
          <div className="flex items-center gap-3">
            <Volume2 className="h-5 w-5 text-cyan-400" />
            <div>
              <div className="font-medium text-sm">Enable alerts audio</div>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Browsers block sound until you interact. Tap once to arm.</div>
            </div>
          </div>
          <Button onClick={playback.unlock} className="bg-gradient-to-r from-cyan-500 to-purple-600">
            <Volume2 className="h-4 w-4 mr-1" /> Enable
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className={`text-xs flex items-center gap-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Audio armed — alerts will play
          </div>
          <Button onClick={playback.stopAll} variant="ghost" size="sm"><StopCircle className="h-4 w-4 mr-1" /> Stop all</Button>
        </div>
      )}

      {/* Section tabs */}
      <div className={`flex gap-1 p-1 rounded-xl border w-fit ${card}`}>
        <button onClick={() => setSection('rules')} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${section === 'rules' ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white' : darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Rules ({rules.length})
        </button>
        <button onClick={() => setSection('sounds')} className={`px-4 py-1.5 rounded-lg text-sm font-medium ${section === 'sounds' ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white' : darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          Sounds ({sounds.length})
        </button>
      </div>

      {editing !== null && section === 'rules' && (
        <RuleEditor
          initial={editing === 'new' ? null : editing}
          sounds={sounds}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          darkMode={darkMode}
        />
      )}

      {section === 'rules' && editing === null && (
        <div className="space-y-3">
          <Button onClick={() => setEditing('new')} className="bg-gradient-to-r from-cyan-500 to-purple-600">
            <Plus className="h-4 w-4 mr-1" /> New rule
          </Button>
          <RuleList
            rules={rules}
            onEdit={setEditing}
            onDelete={r => rulesApi.deleteRule(r.id)}
            onToggle={r => rulesApi.updateRule(r.id, { enabled: !r.enabled })}
            onMove={rulesApi.moveRule}
            onTest={testRule}
            darkMode={darkMode}
          />
        </div>
      )}

      {section === 'sounds' && (
        <SoundLibrary sounds={sounds} soundsApi={soundsApi} darkMode={darkMode} />
      )}
    </div>
  );
}