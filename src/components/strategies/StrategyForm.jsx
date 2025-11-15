import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

export default function StrategyForm({ strategy, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(strategy || {
    name: '',
    description: '',
    rules: [],
    entry_criteria: '',
    exit_criteria: '',
    risk_management: '',
    instruments: [],
    timeframes: [],
    win_rate_target: '',
    risk_reward_target: '',
    active: true
  });

  const [ruleInput, setRuleInput] = useState('');
  const [instrumentInput, setInstrumentInput] = useState('');
  const [timeframeInput, setTimeframeInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      win_rate_target: parseFloat(formData.win_rate_target) || null,
      risk_reward_target: parseFloat(formData.risk_reward_target) || null
    });
  };

  const addRule = () => {
    if (ruleInput.trim()) {
      setFormData({
        ...formData,
        rules: [...(formData.rules || []), ruleInput.trim()]
      });
      setRuleInput('');
    }
  };

  const removeRule = (index) => {
    setFormData({
      ...formData,
      rules: formData.rules.filter((_, i) => i !== index)
    });
  };

  const addInstrument = () => {
    if (instrumentInput.trim() && !formData.instruments.includes(instrumentInput.trim())) {
      setFormData({
        ...formData,
        instruments: [...(formData.instruments || []), instrumentInput.trim()]
      });
      setInstrumentInput('');
    }
  };

  const removeInstrument = (index) => {
    setFormData({
      ...formData,
      instruments: formData.instruments.filter((_, i) => i !== index)
    });
  };

  const addTimeframe = () => {
    if (timeframeInput.trim() && !formData.timeframes.includes(timeframeInput.trim())) {
      setFormData({
        ...formData,
        timeframes: [...(formData.timeframes || []), timeframeInput.trim()]
      });
      setTimeframeInput('');
    }
  };

  const removeTimeframe = (index) => {
    setFormData({
      ...formData,
      timeframes: formData.timeframes.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">
            {strategy ? 'Edit Strategy' : 'Create New Strategy'}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Strategy Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Breakout Strategy"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Describe your strategy..."
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Win Rate Target (%)</label>
              <Input
                type="number"
                step="any"
                value={formData.win_rate_target}
                onChange={(e) => setFormData({...formData, win_rate_target: e.target.value})}
                placeholder="e.g., 65"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Risk:Reward Target</label>
              <Input
                type="number"
                step="any"
                value={formData.risk_reward_target}
                onChange={(e) => setFormData({...formData, risk_reward_target: e.target.value})}
                placeholder="e.g., 2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Entry Criteria</label>
            <Textarea
              value={formData.entry_criteria}
              onChange={(e) => setFormData({...formData, entry_criteria: e.target.value})}
              placeholder="When to enter a trade..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Exit Criteria</label>
            <Textarea
              value={formData.exit_criteria}
              onChange={(e) => setFormData({...formData, exit_criteria: e.target.value})}
              placeholder="When to exit a trade..."
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Risk Management</label>
            <Textarea
              value={formData.risk_management}
              onChange={(e) => setFormData({...formData, risk_management: e.target.value})}
              placeholder="Risk rules, position sizing, stop loss rules..."
              rows={3}
            />
          </div>

          {/* Rules */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Trading Rules</label>
            <div className="flex gap-2 mb-3">
              <Input
                value={ruleInput}
                onChange={(e) => setRuleInput(e.target.value)}
                placeholder="Add a rule..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRule())}
              />
              <Button type="button" onClick={addRule} variant="outline">
                Add
              </Button>
            </div>
            {formData.rules && formData.rules.length > 0 && (
              <div className="space-y-2">
                {formData.rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <span className="text-sm text-slate-900">{rule}</span>
                    <button
                      type="button"
                      onClick={() => removeRule(idx)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instruments & Timeframes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Instruments</label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={instrumentInput}
                  onChange={(e) => setInstrumentInput(e.target.value)}
                  placeholder="e.g., EURUSD, NQ"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInstrument())}
                />
                <Button type="button" onClick={addInstrument} variant="outline" size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.instruments && formData.instruments.map((inst, idx) => (
                  <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {inst}
                    <button type="button" onClick={() => removeInstrument(idx)} className="hover:text-blue-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Timeframes</label>
              <div className="flex gap-2 mb-3">
                <Input
                  value={timeframeInput}
                  onChange={(e) => setTimeframeInput(e.target.value)}
                  placeholder="e.g., 5m, 1h, 4h"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTimeframe())}
                />
                <Button type="button" onClick={addTimeframe} variant="outline" size="sm">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.timeframes && formData.timeframes.map((tf, idx) => (
                  <span key={idx} className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                    {tf}
                    <button type="button" onClick={() => removeTimeframe(idx)} className="hover:text-green-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({...formData, active: e.target.checked})}
              className="w-4 h-4 text-blue-600"
            />
            <label htmlFor="active" className="text-sm font-medium text-slate-700">
              Active (currently using this strategy)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {strategy ? 'Update Strategy' : 'Create Strategy'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}