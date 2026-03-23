import React, { useState } from 'react';
import { X, GripVertical, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ALL_OPTIONS = [
  { id: 'dashboard',    name: 'Home',      page: 'Dashboard' },
  { id: 'planning',     name: 'Plans',     page: 'TradePlans' },
  { id: 'trades',       name: 'Trades',    page: 'Trades' },
  { id: 'journal',      name: 'Journal',   page: 'Journal' },
  { id: 'signals',      name: 'Signals',   page: 'LiveTradingSignals' },
  { id: 'coach',        name: 'Coach',     page: 'TradingCoach' },
  { id: 'analytics',    name: 'Analytics', page: 'Analytics' },
  { id: 'market',       name: 'Markets',   page: 'MarketData' },
  { id: 'accounts',     name: 'Accounts',  page: 'Accounts' },
  { id: 'community',    name: 'Social',    page: 'SocialFeed' },
  { id: 'profile',      name: 'Profile',   page: 'MyProfile' },
  { id: 'notifications',name: 'Alerts',    page: 'Notifications' },
  { id: 'calculators',  name: 'Calc',      page: 'Calculators' },
  { id: 'achievements', name: 'Badges',    page: 'Achievements' },
];

const MAX_TABS = 5;

export default function MobileTabCustomizer({ selectedIds, onSave, onClose, darkMode }) {
  const [selected, setSelected] = useState(selectedIds.slice(0, MAX_TABS));

  const toggle = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else if (selected.length < MAX_TABS) {
      setSelected([...selected, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-t-2xl p-6 pb-10 ${darkMode ? 'bg-slate-900 border-t border-cyan-500/20' : 'bg-white border-t border-slate-200'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              Customize Tab Bar
            </h2>
            <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Select up to {MAX_TABS} tabs ({selected.length}/{MAX_TABS} chosen)
            </p>
          </div>
          <button onClick={onClose} className={darkMode ? 'text-slate-400' : 'text-slate-500'}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6 max-h-72 overflow-y-auto">
          {ALL_OPTIONS.map(opt => {
            const isSelected = selected.includes(opt.id);
            const isDisabled = !isSelected && selected.length >= MAX_TABS;
            return (
              <button
                key={opt.id}
                onClick={() => toggle(opt.id)}
                disabled={isDisabled}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white border-transparent'
                    : isDisabled
                      ? darkMode ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed' : 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                      : darkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-cyan-500/50' : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-400'
                }`}
              >
                <span>{opt.name}</span>
                {isSelected && <Check className="h-4 w-4 ml-2 shrink-0" />}
              </button>
            );
          })}
        </div>

        <Button
          onClick={() => onSave(selected)}
          disabled={selected.length === 0}
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 h-11 text-base"
        >
          Save Tab Bar
        </Button>
      </div>
    </div>
  );
}

export { ALL_OPTIONS };