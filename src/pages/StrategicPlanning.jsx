import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, TrendingUp, Target, Brain, AlertCircle } from 'lucide-react';
import MonthlyPlanForm from '@/components/planning/MonthlyPlanForm';
import WeeklyPlanForm from '@/components/planning/WeeklyPlanForm';
import DailyPlanForm from '@/components/planning/DailyPlanForm';
import PlanCorrelationView from '@/components/planning/PlanCorrelationView';

export default function StrategicPlanning() {
  const [activeTab, setActiveTab] = useState('daily');
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: monthlyPlans = [] } = useQuery({
    queryKey: ['monthlyPlans'],
    queryFn: () => base44.entities.MonthlyTradePlan.list('-month_start_date', 12)
  });

  const { data: weeklyPlans = [] } = useQuery({
    queryKey: ['weeklyPlans'],
    queryFn: () => base44.entities.WeeklyTradePlan.list('-week_start_date', 12)
  });

  const { data: dailyPlans = [] } = useQuery({
    queryKey: ['dailyPlans'],
    queryFn: () => base44.entities.DailyTradePlan.list('-date', 30)
  });

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthPlan = monthlyPlans.find(p => p.month === currentMonth);

  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay() + 1);
  const weekStartStr = currentWeekStart.toISOString().split('T')[0];
  const currentWeekPlan = weeklyPlans.find(p => p.week_start_date === weekStartStr);

  const todayStr = new Date().toISOString().split('T')[0];
  const currentDailyPlan = dailyPlans.find(p => p.date === todayStr);

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
            Strategic Trading Plans
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
            Plan monthly, weekly, and daily - stay aligned with your trading vision
          </p>
        </div>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Brain className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <div>
                <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Why Plan at Multiple Timeframes?
                </h3>
                <ul className={`text-sm space-y-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <li>📅 <strong>Monthly:</strong> Big picture thesis, macro drivers, goals, skill development</li>
                  <li>📊 <strong>Weekly:</strong> Key levels, economic events, primary setups (Sunday prep)</li>
                  <li>🎯 <strong>Daily:</strong> Specific trade ideas, risk calculations, execution rules</li>
                  <li>🔄 <strong>Correlation:</strong> Track if you're on plan or pivoting based on market conditions</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan Correlation Overview */}
        <PlanCorrelationView 
          monthlyPlan={currentMonthPlan}
          weeklyPlan={currentWeekPlan}
          dailyPlan={currentDailyPlan}
        />

        {/* Planning Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full grid-cols-3 ${darkMode ? 'bg-slate-950/80' : 'bg-white'}`}>
            <TabsTrigger value="monthly" className={darkMode ? 'data-[state=active]:bg-cyan-500/20' : ''}>
              <Target className="h-4 w-4 mr-2" />
              Monthly
            </TabsTrigger>
            <TabsTrigger value="weekly" className={darkMode ? 'data-[state=active]:bg-cyan-500/20' : ''}>
              <TrendingUp className="h-4 w-4 mr-2" />
              Weekly
            </TabsTrigger>
            <TabsTrigger value="daily" className={darkMode ? 'data-[state=active]:bg-cyan-500/20' : ''}>
              <Calendar className="h-4 w-4 mr-2" />
              Daily
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="space-y-6">
            <MonthlyPlanForm existingPlan={currentMonthPlan} />
            
            {monthlyPlans.length > 0 && (
              <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
                <CardHeader>
                  <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
                    Previous Months
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {monthlyPlans.slice(0, 6).map(plan => (
                      <div key={plan.id} className={`p-4 rounded-lg border ${
                        darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {new Date(plan.month_start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </h4>
                            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              {plan.big_picture_thesis?.slice(0, 100)}...
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            plan.status === 'completed' 
                              ? 'bg-green-500/20 text-green-400' 
                              : plan.status === 'in_progress'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {plan.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="weekly" className="space-y-6">
            <WeeklyPlanForm 
              existingPlan={currentWeekPlan} 
              monthlyPlan={currentMonthPlan}
            />

            {weeklyPlans.length > 0 && (
              <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
                <CardHeader>
                  <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>
                    Previous Weeks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {weeklyPlans.slice(0, 8).map(plan => (
                      <div key={plan.id} className={`p-4 rounded-lg border ${
                        darkMode ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              Week of {new Date(plan.week_start_date).toLocaleDateString()}
                            </h4>
                            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                              Bias: {plan.market_bias} • Focus: {plan.instruments_to_focus?.join(', ')}
                            </p>
                          </div>
                          <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                            plan.status === 'completed' 
                              ? 'bg-green-500/20 text-green-400' 
                              : plan.status === 'in_progress'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}>
                            {plan.status}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="daily" className="space-y-6">
            <DailyPlanForm 
              existingPlan={currentDailyPlan}
              weeklyPlan={currentWeekPlan}
              monthlyPlan={currentMonthPlan}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}