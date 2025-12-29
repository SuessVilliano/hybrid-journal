import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Sparkles, Loader2, TrendingUp } from 'lucide-react';

export default function WeeklyPlanForm({ existingPlan, monthlyPlan }) {
  const queryClient = useQueryClient();
  const darkMode = document.documentElement.classList.contains('dark');

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);

  const [formData, setFormData] = useState({
    week_start_date: weekStart.toISOString().split('T')[0],
    week_end_date: weekEnd.toISOString().split('T')[0],
    plan_text: '',
    market_bias: 'Neutral',
    key_levels: {},
    economic_events: [],
    primary_setups: [],
    instruments_to_focus: [],
    weekly_goals: {
      max_trades: 0,
      profit_target: 0,
      max_risk: 0,
      win_rate_target: 50
    },
    rules_to_follow: [],
    things_to_avoid: [],
    linked_monthly_plan_id: monthlyPlan?.id || '',
    status: 'planned'
  });

  useEffect(() => {
    if (existingPlan) {
      setFormData(existingPlan);
    } else if (monthlyPlan) {
      setFormData(prev => ({
        ...prev,
        linked_monthly_plan_id: monthlyPlan.id,
        instruments_to_focus: monthlyPlan.instruments_universe || [],
        weekly_goals: {
          ...prev.weekly_goals,
          profit_target: Math.round((monthlyPlan.monthly_goals?.profit_target || 0) / 4)
        }
      }));
    }
  }, [existingPlan, monthlyPlan]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingPlan) {
        return base44.entities.WeeklyTradePlan.update(existingPlan.id, data);
      } else {
        return base44.entities.WeeklyTradePlan.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['weeklyPlans']);
      alert('Weekly plan saved!');
    }
  });

  const generateAISummary = async () => {
    try {
      const summary = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a concise weekly trading plan summary based on:
        
Market Bias: ${formData.market_bias}
Instruments: ${formData.instruments_to_focus.join(', ')}
Primary Setups: ${formData.primary_setups.join(', ')}
Weekly Goals: ${formData.weekly_goals.profit_target} profit, ${formData.weekly_goals.max_trades} max trades
${monthlyPlan ? `Monthly Context: ${monthlyPlan.big_picture_thesis}` : ''}

Provide 2-3 sentences focusing on key opportunities and risk management.`
      });
      setFormData({ ...formData, ai_summary: summary });
    } catch (error) {
      console.error('Failed to generate AI summary:', error);
    }
  };

  const addToList = (field, value) => {
    if (value.trim()) {
      setFormData({
        ...formData,
        [field]: [...(formData[field] || []), value.trim()]
      });
    }
  };

  const removeFromList = (field, index) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, i) => i !== index)
    });
  };

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
          {existingPlan ? 'Edit' : 'Create'} Weekly Plan - Week of {new Date(formData.week_start_date).toLocaleDateString()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {monthlyPlan && (
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/30 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'}`}>
            <h4 className={`font-bold text-sm mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              📊 Aligned with Monthly Plan
            </h4>
            <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-900'}`}>
              {monthlyPlan.big_picture_thesis?.slice(0, 150)}...
            </p>
          </div>
        )}

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Market Bias for the Week
          </label>
          <Select value={formData.market_bias} onValueChange={(v) => setFormData({ ...formData, market_bias: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bullish">🟢 Bullish</SelectItem>
              <SelectItem value="Bearish">🔴 Bearish</SelectItem>
              <SelectItem value="Neutral">⚪ Neutral</SelectItem>
              <SelectItem value="Mixed">🟡 Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Weekly Plan
          </label>
          <Textarea
            value={formData.plan_text}
            onChange={(e) => setFormData({ ...formData, plan_text: e.target.value })}
            placeholder="What are the key themes, levels, and opportunities for this week?..."
            rows={6}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Weekly Profit Target ($)
            </label>
            <Input
              type="number"
              value={formData.weekly_goals.profit_target}
              onChange={(e) => setFormData({
                ...formData,
                weekly_goals: { ...formData.weekly_goals, profit_target: parseFloat(e.target.value) }
              })}
              placeholder="1000"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Max Trades This Week
            </label>
            <Input
              type="number"
              value={formData.weekly_goals.max_trades}
              onChange={(e) => setFormData({
                ...formData,
                weekly_goals: { ...formData.weekly_goals, max_trades: parseInt(e.target.value) }
              })}
              placeholder="20"
            />
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Primary Trade Setups
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Add setup (e.g., London Open Breakout, NY Session Reversal)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addToList('primary_setups', e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.primary_setups?.map((item, idx) => (
              <span key={idx} className={`px-3 py-1 rounded-lg text-sm ${
                darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
              }`}>
                {item}
                <button onClick={() => removeFromList('primary_setups', idx)} className="ml-2">×</button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Instruments to Focus On
          </label>
          <div className="flex gap-2 mb-2">
            <Input
              placeholder="Add instrument (e.g., EURUSD, NQ, BTCUSD)"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addToList('instruments_to_focus', e.target.value);
                  e.target.value = '';
                }
              }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.instruments_to_focus?.map((item, idx) => (
              <span key={idx} className={`px-3 py-1 rounded-lg text-sm ${
                darkMode ? 'bg-cyan-900/30 text-cyan-400' : 'bg-cyan-100 text-cyan-700'
              }`}>
                {item}
                <button onClick={() => removeFromList('instruments_to_focus', idx)} className="ml-2">×</button>
              </span>
            ))}
          </div>
        </div>

        {formData.ai_summary && (
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-purple-900/30 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'}`}>
            <h4 className={`font-bold mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
              AI Summary
            </h4>
            <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-900'}`}>
              {formData.ai_summary}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button
            onClick={generateAISummary}
            variant="outline"
            disabled={!formData.plan_text}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate AI Summary
          </Button>
          <Button
            onClick={() => saveMutation.mutate(formData)}
            disabled={!formData.plan_text || saveMutation.isLoading}
            className="bg-gradient-to-r from-cyan-500 to-purple-600"
          >
            {saveMutation.isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveMutation.isLoading ? 'Saving...' : 'Save Weekly Plan'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}