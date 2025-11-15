import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

export default function GoalForm({ goal, onSubmit, onCancel }) {
  const [formData, setFormData] = useState(goal || {
    title: '',
    description: '',
    type: 'Profit Target',
    target_value: '',
    current_value: 0,
    start_date: new Date().toISOString().slice(0, 10),
    target_date: '',
    status: 'Not Started',
    action_steps: [],
    progress_notes: ''
  });

  const [stepInput, setStepInput] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      target_value: parseFloat(formData.target_value) || 0,
      current_value: parseFloat(formData.current_value) || 0
    });
  };

  const addStep = () => {
    if (stepInput.trim()) {
      setFormData({
        ...formData,
        action_steps: [...(formData.action_steps || []), stepInput.trim()]
      });
      setStepInput('');
    }
  };

  const removeStep = (index) => {
    setFormData({
      ...formData,
      action_steps: formData.action_steps.filter((_, i) => i !== index)
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-900">
            {goal ? 'Edit Goal' : 'Create New Goal'}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Goal Title *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              placeholder="e.g., Reach $10,000 profit"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Describe your goal in detail..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Goal Type *</label>
              <Select value={formData.type} onValueChange={(val) => setFormData({...formData, type: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Profit Target">Profit Target</SelectItem>
                  <SelectItem value="Win Rate">Win Rate</SelectItem>
                  <SelectItem value="Risk Management">Risk Management</SelectItem>
                  <SelectItem value="Consistency">Consistency</SelectItem>
                  <SelectItem value="Skill Development">Skill Development</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Target Value *</label>
              <Input
                type="number"
                step="any"
                value={formData.target_value}
                onChange={(e) => setFormData({...formData, target_value: e.target.value})}
                placeholder="e.g., 10000 or 75 (for %)"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Current Value</label>
              <Input
                type="number"
                step="any"
                value={formData.current_value}
                onChange={(e) => setFormData({...formData, current_value: e.target.value})}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
              <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Achieved">Achieved</SelectItem>
                  <SelectItem value="Abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Start Date</label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Target Date</label>
              <Input
                type="date"
                value={formData.target_date}
                onChange={(e) => setFormData({...formData, target_date: e.target.value})}
              />
            </div>
          </div>

          {/* Action Steps */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Action Steps</label>
            <div className="flex gap-2 mb-3">
              <Input
                value={stepInput}
                onChange={(e) => setStepInput(e.target.value)}
                placeholder="Add an action step..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
              />
              <Button type="button" onClick={addStep} variant="outline">
                Add
              </Button>
            </div>
            {formData.action_steps && formData.action_steps.length > 0 && (
              <div className="space-y-2">
                {formData.action_steps.map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                    <span className="text-sm text-slate-900">{step}</span>
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Progress Notes</label>
            <Textarea
              value={formData.progress_notes}
              onChange={(e) => setFormData({...formData, progress_notes: e.target.value})}
              placeholder="Track your progress and reflections..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              {goal ? 'Update Goal' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}