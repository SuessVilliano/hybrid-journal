import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Plus, Edit, CheckCircle2, AlertCircle, TrendingUp, Target } from 'lucide-react';
import DailyPlanForm from './DailyPlanForm';

export default function TodaysPlanWidget({ onPlanCreated }) {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: todaysPlan, isLoading } = useQuery({
    queryKey: ['todaysTradePlan', today],
    queryFn: async () => {
      const plans = await base44.entities.DailyTradePlan.filter({ date: today }, '-created_date', 1);
      return plans[0] || null;
    }
  });

  const { data: todaysTrades = [] } = useQuery({
    queryKey: ['todaysTrades', today],
    queryFn: async () => {
      const allTrades = await base44.entities.Trade.list('-entry_date', 100);
      return allTrades.filter(t => t.entry_date?.startsWith(today));
    }
  });

  const analyzeExecutionMutation = useMutation({
    mutationFn: async () => {
      if (!todaysPlan || todaysTrades.length === 0) return;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt: `Compare this trader's plan vs actual execution and provide encouraging insights:

PLAN:
${todaysPlan.plan_text}
Rules: ${todaysPlan.trading_rules.join(', ') || 'None'}
Max trades: ${todaysPlan.max_trades || 'Not set'}
Max risk: ${todaysPlan.max_risk ? '$' + todaysPlan.max_risk : 'Not set'}
Markets to watch: ${todaysPlan.markets_to_watch.join(', ') || 'None'}

ACTUAL EXECUTION:
Trades taken: ${todaysTrades.length}
Total P&L: $${todaysTrades.reduce((sum, t) => sum + (t.pnl || 0), 0).toFixed(2)}
Symbols traded: ${[...new Set(todaysTrades.map(t => t.symbol))].join(', ')}

Provide:
1. Alignment score (0-100) - how well did they follow their plan?
2. Rules followed (number)
3. Rules broken (specific examples if any)
4. Encouraging insights (2-3 sentences, coach-like tone, highlight what went well)
5. One suggestion for tomorrow`,
        response_json_schema: {
          type: "object",
          properties: {
            alignment_score: { type: "number" },
            rules_followed: { type: "number" },
            rules_broken: { type: "array", items: { type: "string" } },
            insights: { type: "string" },
            tomorrow_suggestion: { type: "string" }
          }
        }
      });

      await base44.entities.DailyTradePlan.update(todaysPlan.id, {
        execution_analysis: {
          trades_taken: todaysTrades.length,
          rules_followed: analysis.rules_followed,
          rules_broken: analysis.rules_broken,
          alignment_score: analysis.alignment_score,
          insights: analysis.insights,
          tomorrow_suggestion: analysis.tomorrow_suggestion
        },
        status: 'reviewed'
      });

      return analysis;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['todaysTradePlan', today]);
    }
  });

  const darkMode = document.documentElement.classList.contains('dark');

  if (showForm) {
    return (
      <Card className={`backdrop-blur-xl ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}`}>
        <CardHeader>
          <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
            {todaysPlan ? 'Edit Today\'s Plan' : 'Create Today\'s Plan'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DailyPlanForm
            existingPlan={todaysPlan}
            onClose={() => setShowForm(false)}
            onSuccess={() => {
              setShowForm(false);
              onPlanCreated?.();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={`backdrop-blur-xl ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}`}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto"></div>
        </CardContent>
      </Card>
    );
  }

  if (!todaysPlan) {
    return (
      <Card className={`backdrop-blur-xl ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}`}>
        <CardContent className="p-8 text-center">
          <ClipboardList className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
          <h3 className={`text-lg font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Start Your Day Right
          </h3>
          <p className={`text-sm mb-4 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Create your daily plan to stay focused and accountable
          </p>
          <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-cyan-500 to-purple-600">
            <Plus className="h-4 w-4 mr-2" />
            Create Today's Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  const completedChecklist = todaysPlan.checklist_items?.filter(item => item.completed).length || 0;
  const totalChecklist = todaysPlan.checklist_items?.length || 0;

  return (
    <Card className={`backdrop-blur-xl ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            <ClipboardList className="h-5 w-5" />
            Today's Plan
          </CardTitle>
          <div className="flex items-center gap-2">
            {todaysPlan.clarity_score && (
              <Badge className={`${
                todaysPlan.clarity_score >= 80 ? 'bg-green-500' :
                todaysPlan.clarity_score >= 60 ? 'bg-yellow-500' :
                'bg-orange-500'
              } text-white`}>
                {todaysPlan.clarity_score}% Clear
              </Badge>
            )}
            <Button onClick={() => setShowForm(true)} size="sm" variant="outline">
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {todaysPlan.ai_summary && (
          <div className={`p-3 rounded-lg ${
            darkMode ? 'bg-purple-900/20 border border-purple-500/30' : 'bg-purple-50 border border-purple-200'
          }`}>
            <p className={`text-sm ${darkMode ? 'text-purple-200' : 'text-purple-900'}`}>
              💡 {todaysPlan.ai_summary}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className={`text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Checklist
            </div>
            <div className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {completedChecklist}/{totalChecklist}
              {completedChecklist === totalChecklist && ' ✅'}
            </div>
          </div>

          {todaysPlan.max_trades && (
            <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
              <div className={`text-xs font-medium mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Trades Today
              </div>
              <div className={`text-lg font-bold ${
                todaysTrades.length > todaysPlan.max_trades 
                  ? 'text-orange-500' 
                  : darkMode ? 'text-white' : 'text-slate-900'
              }`}>
                {todaysTrades.length}/{todaysPlan.max_trades}
              </div>
            </div>
          )}
        </div>

        {todaysPlan.trading_rules?.length > 0 && (
          <div>
            <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Today's Rules:
            </div>
            <div className="space-y-1">
              {todaysPlan.trading_rules.map((rule, idx) => (
                <div key={idx} className={`text-sm flex items-center gap-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <CheckCircle2 className="h-3 w-3 text-cyan-500" />
                  {rule}
                </div>
              ))}
            </div>
          </div>
        )}

        {todaysPlan.markets_to_watch?.length > 0 && (
          <div>
            <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Watching:
            </div>
            <div className="flex flex-wrap gap-2">
              {todaysPlan.markets_to_watch.map((market, idx) => (
                <Badge key={idx} variant="outline" className={darkMode ? 'border-cyan-500/30 text-cyan-400' : ''}>
                  {market}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {todaysTrades.length > 0 && !todaysPlan.execution_analysis && (
          <Button
            onClick={() => analyzeExecutionMutation.mutate()}
            disabled={analyzeExecutionMutation.isPending}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            size="sm"
          >
            {analyzeExecutionMutation.isPending ? (
              <>Analyzing Execution...</>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Analyze My Execution
              </>
            )}
          </Button>
        )}

        {todaysPlan.execution_analysis && (
          <div className={`p-4 rounded-lg space-y-3 ${
            darkMode ? 'bg-gradient-to-br from-green-900/20 to-cyan-900/20 border border-green-500/30' : 'bg-gradient-to-br from-green-50 to-cyan-50 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                📊 Execution Analysis
              </div>
              <Badge className={`${
                todaysPlan.execution_analysis.alignment_score >= 80 ? 'bg-green-500' :
                todaysPlan.execution_analysis.alignment_score >= 60 ? 'bg-yellow-500' :
                'bg-orange-500'
              } text-white`}>
                {todaysPlan.execution_analysis.alignment_score}% Aligned
              </Badge>
            </div>
            
            <p className={`text-sm ${darkMode ? 'text-green-200' : 'text-green-900'}`}>
              {todaysPlan.execution_analysis.insights}
            </p>

            {todaysPlan.execution_analysis.rules_broken?.length > 0 && (
              <div className={`text-xs space-y-1 ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                <div className="font-medium">Areas to work on:</div>
                {todaysPlan.execution_analysis.rules_broken.map((rule, idx) => (
                  <div key={idx}>• {rule}</div>
                ))}
              </div>
            )}

            {todaysPlan.execution_analysis.tomorrow_suggestion && (
              <div className={`text-xs pt-2 border-t ${
                darkMode ? 'border-cyan-500/30 text-cyan-300' : 'border-cyan-200 text-cyan-700'
              }`}>
                <div className="font-medium mb-1">💡 For Tomorrow:</div>
                {todaysPlan.execution_analysis.tomorrow_suggestion}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}