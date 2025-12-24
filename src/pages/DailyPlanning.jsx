import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, CheckCircle2, XCircle, Plus } from 'lucide-react';
import TodaysPlanWidget from '@/components/planning/TodaysPlanWidget';
import { format, subDays } from 'date-fns';

export default function DailyPlanning() {
  const [selectedDate, setSelectedDate] = useState(null);
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: recentPlans = [], isLoading } = useQuery({
    queryKey: ['recentDailyPlans'],
    queryFn: async () => {
      const plans = await base44.entities.DailyTradePlan.list('-date', 30);
      return plans;
    }
  });

  const getAlignmentColor = (score) => {
    if (!score) return darkMode ? 'bg-slate-700' : 'bg-slate-200';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            Daily Planning
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
            Plan your day, stay accountable, and improve consistently
          </p>
        </div>

        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/30' : 'bg-gradient-to-r from-cyan-50 to-purple-50 border border-cyan-200'
        }`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                darkMode ? 'bg-cyan-900/30' : 'bg-cyan-100'
              }`}>
                <Calendar className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              </div>
            </div>
            <div>
              <h3 className={`font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Why Daily Planning?
              </h3>
              <p className={`text-sm ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
                Traders who plan their day are 3x more likely to follow their rules and improve consistently. 
                Set your intentions each morning, review your execution, and watch your discipline improve.
              </p>
            </div>
          </div>
        </div>

        <TodaysPlanWidget />

        <Card className={`backdrop-blur-xl ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}`}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
              Your Planning History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
              </div>
            ) : recentPlans.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className={`h-12 w-12 mx-auto mb-3 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                  No plans yet. Create your first daily plan above!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentPlans.map((plan) => (
                  <Card key={plan.id} className={`${
                    darkMode ? 'bg-slate-900/50 border-cyan-500/20 hover:bg-slate-900/70' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  } transition-colors cursor-pointer`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {format(new Date(plan.date), 'MMM dd, yyyy')}
                          </div>
                          {plan.clarity_score && (
                            <Badge className={`${getAlignmentColor(plan.clarity_score)} text-white`}>
                              {plan.clarity_score}% Clear
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {plan.execution_analysis?.alignment_score && (
                            <Badge className={`${getAlignmentColor(plan.execution_analysis.alignment_score)} text-white`}>
                              {plan.execution_analysis.alignment_score}% Aligned
                            </Badge>
                          )}
                          {plan.status === 'reviewed' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : plan.status === 'in_progress' ? (
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                          ) : null}
                        </div>
                      </div>

                      {plan.ai_summary && (
                        <p className={`text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {plan.ai_summary}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 mt-2">
                        {plan.markets_to_watch?.slice(0, 3).map((market, idx) => (
                          <Badge key={idx} variant="outline" className={`text-xs ${darkMode ? 'border-cyan-500/30 text-cyan-400' : ''}`}>
                            {market}
                          </Badge>
                        ))}
                        {plan.markets_to_watch?.length > 3 && (
                          <Badge variant="outline" className={`text-xs ${darkMode ? 'border-cyan-500/30 text-cyan-400' : ''}`}>
                            +{plan.markets_to_watch.length - 3} more
                          </Badge>
                        )}
                      </div>

                      {plan.execution_analysis?.insights && (
                        <div className={`mt-3 pt-3 border-t text-sm ${
                          darkMode ? 'border-cyan-500/20 text-green-300' : 'border-slate-200 text-green-700'
                        }`}>
                          💡 {plan.execution_analysis.insights.substring(0, 150)}...
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}