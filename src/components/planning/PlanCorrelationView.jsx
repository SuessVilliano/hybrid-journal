import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Link as LinkIcon, ArrowRight } from 'lucide-react';

export default function PlanCorrelationView({ monthlyPlan, weeklyPlan, dailyPlan, trades = [] }) {
  const darkMode = document.documentElement.classList.contains('dark');
  
  const calculatePlanAdherence = () => {
    if (!dailyPlan?.linked_trade_ids || dailyPlan.linked_trade_ids.length === 0) {
      return null;
    }
    
    const linkedTrades = trades.filter(t => dailyPlan.linked_trade_ids.includes(t.id));
    const followedRules = linkedTrades.filter(t => t.followed_rules === true).length;
    const totalLinked = linkedTrades.length;
    
    if (totalLinked === 0) return null;
    
    return Math.round((followedRules / totalLinked) * 100);
  };
  
  const adherenceScore = calculatePlanAdherence();

  if (!monthlyPlan && !weeklyPlan && !dailyPlan) {
    return null;
  }

  const calculateAlignment = () => {
    let score = 0;
    let total = 0;

    if (monthlyPlan && weeklyPlan) {
      total++;
      if (weeklyPlan.linked_monthly_plan_id === monthlyPlan.id) score++;
    }

    if (weeklyPlan && weeklyPlan.execution_tracking?.on_track !== undefined) {
      total++;
      if (weeklyPlan.execution_tracking.on_track) score++;
    }

    if (monthlyPlan && monthlyPlan.execution_tracking?.on_track !== undefined) {
      total++;
      if (monthlyPlan.execution_tracking.on_track) score++;
    }
    
    if (adherenceScore !== null) {
      total++;
      if (adherenceScore >= 70) score++;
    }

    return total > 0 ? Math.round((score / total) * 100) : null;
  };

  const alignmentScore = calculateAlignment();

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
          Plan Alignment & Tracking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visual Connection Flow */}
        <div className={`flex items-center justify-between p-4 rounded-lg ${darkMode ? 'bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border border-purple-500/30' : 'bg-gradient-to-r from-purple-50 to-cyan-50 border border-purple-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded ${darkMode ? 'bg-purple-500/20 text-purple-300' : 'bg-purple-100 text-purple-700'} text-xs font-medium`}>
              Monthly
            </div>
            <ArrowRight className={`h-4 w-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
            <div className={`px-3 py-1 rounded ${darkMode ? 'bg-cyan-500/20 text-cyan-300' : 'bg-cyan-100 text-cyan-700'} text-xs font-medium`}>
              Weekly
            </div>
            <ArrowRight className={`h-4 w-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <div className={`px-3 py-1 rounded ${darkMode ? 'bg-green-500/20 text-green-300' : 'bg-green-100 text-green-700'} text-xs font-medium`}>
              Daily
            </div>
            <ArrowRight className={`h-4 w-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            <div className={`px-3 py-1 rounded ${darkMode ? 'bg-yellow-500/20 text-yellow-300' : 'bg-yellow-100 text-yellow-700'} text-xs font-medium`}>
              Trades
            </div>
          </div>
          {weeklyPlan?.linked_monthly_plan_id === monthlyPlan?.id && (
            <div className="flex items-center gap-2">
              <LinkIcon className={`h-4 w-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              <span className={`text-xs font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                Plans Linked
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Monthly Status */}
          {monthlyPlan && (
            <div className={`p-4 rounded-lg border ${
              darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Monthly Plan
                </h4>
                <Badge className={
                  monthlyPlan.execution_tracking?.on_track 
                    ? 'bg-green-500/20 text-green-400' 
                    : monthlyPlan.execution_tracking?.on_track === false
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-slate-500/20 text-slate-400'
                }>
                  {monthlyPlan.execution_tracking?.on_track 
                    ? 'On Track' 
                    : monthlyPlan.execution_tracking?.on_track === false
                    ? 'Off Track'
                    : 'No Data'}
                </Badge>
              </div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {monthlyPlan.big_picture_thesis?.slice(0, 80)}...
              </p>
              {monthlyPlan.execution_tracking?.goal_progress_percent !== undefined && (
                <div className="mt-2">
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Goal Progress
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`flex-1 h-2 rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-purple-600"
                        style={{ width: `${Math.min(monthlyPlan.execution_tracking.goal_progress_percent, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {monthlyPlan.execution_tracking.goal_progress_percent}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Weekly Status */}
          {weeklyPlan && (
            <div className={`p-4 rounded-lg border ${
              darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Weekly Plan
                </h4>
                <Badge className={`${
                  weeklyPlan.market_bias === 'Bullish' 
                    ? 'bg-green-500/20 text-green-400'
                    : weeklyPlan.market_bias === 'Bearish'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-slate-500/20 text-slate-400'
                }`}>
                  {weeklyPlan.market_bias}
                </Badge>
              </div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Focus: {weeklyPlan.instruments_to_focus?.slice(0, 3).join(', ')}
              </p>
              {weeklyPlan.weekly_goals && (
                <div className="mt-2 text-xs">
                  <div className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                    Target: ${weeklyPlan.weekly_goals.profit_target}
                  </div>
                  {weeklyPlan.execution_tracking?.profit_so_far !== undefined && (
                    <div className={`font-bold ${
                      weeklyPlan.execution_tracking.profit_so_far >= 0 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      Current: ${weeklyPlan.execution_tracking.profit_so_far}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Daily Status */}
          {dailyPlan && (
            <div className={`p-4 rounded-lg border ${
              darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Daily Plan
                </h4>
                <Badge className={
                  dailyPlan.status === 'completed' 
                    ? 'bg-green-500/20 text-green-400' 
                    : dailyPlan.status === 'in_progress'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'bg-slate-500/20 text-slate-400'
                }>
                  {dailyPlan.status}
                </Badge>
              </div>
              <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Max Trades: {dailyPlan.max_trades || 'Not set'}
              </p>
              {dailyPlan.linked_trade_ids && dailyPlan.linked_trade_ids.length > 0 && (
                <div className="mt-2">
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Linked Trades</div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-cyan-500" />
                    <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {dailyPlan.linked_trade_ids.length}
                    </span>
                  </div>
                </div>
              )}
              {adherenceScore !== null && (
                <div className="mt-2">
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Plan Adherence
                  </div>
                  <div className={`text-lg font-bold ${
                    adherenceScore >= 70 
                      ? 'text-green-400' 
                      : adherenceScore >= 40
                      ? 'text-yellow-400'
                      : 'text-red-400'
                  }`}>
                    {adherenceScore}%
                  </div>
                </div>
              )}
              {dailyPlan.clarity_score && (
                <div className="mt-2">
                  <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Plan Clarity</div>
                  <div className={`text-sm font-bold ${
                    dailyPlan.clarity_score >= 80 ? 'text-green-400' :
                    dailyPlan.clarity_score >= 60 ? 'text-yellow-400' :
                    'text-orange-400'
                  }`}>
                    {dailyPlan.clarity_score}%
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Alignment Indicator */}
        {alignmentScore !== null && (
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border border-cyan-500/30' : 'bg-gradient-to-r from-cyan-50 to-purple-50 border border-cyan-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-bold mb-1 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                  Overall Alignment Score
                </h4>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  How well you're tracking to your plans
                </p>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold ${
                  alignmentScore >= 70 ? 'text-green-400' : alignmentScore >= 40 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {alignmentScore}%
                </div>
                {alignmentScore >= 70 ? (
                  <TrendingUp className="h-6 w-6 mx-auto text-green-400" />
                ) : alignmentScore >= 40 ? (
                  <Minus className="h-6 w-6 mx-auto text-yellow-400" />
                ) : (
                  <TrendingDown className="h-6 w-6 mx-auto text-red-400" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Pivot Warnings */}
        {(weeklyPlan?.execution_tracking?.pivot_notes || monthlyPlan?.execution_tracking?.major_pivots) && (
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-yellow-900/30 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-start gap-3">
              <AlertCircle className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <div>
                <h4 className={`font-bold text-sm mb-2 ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                  Pivots & Adjustments
                </h4>
                {weeklyPlan?.execution_tracking?.pivot_notes && (
                  <p className={`text-sm mb-2 ${darkMode ? 'text-yellow-300' : 'text-yellow-900'}`}>
                    Weekly: {weeklyPlan.execution_tracking.pivot_notes}
                  </p>
                )}
                {monthlyPlan?.execution_tracking?.major_pivots && (
                  <div>
                    {monthlyPlan.execution_tracking.major_pivots.map((pivot, idx) => (
                      <p key={idx} className={`text-sm ${darkMode ? 'text-yellow-300' : 'text-yellow-900'}`}>
                        • {pivot}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}