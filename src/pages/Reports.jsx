import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import GlobalAccountSelector, { useSelectedAccounts } from '@/components/accounts/GlobalAccountSelector';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart3, Brain, TrendingUp, Table, FileText, Calendar } from 'lucide-react';
import AIInsightsPanel from '@/components/analytics/AIInsightsPanel';
import AdvancedCharts from '@/components/analytics/AdvancedCharts';
import PerformanceMetrics from '@/components/trading/PerformanceMetrics';
import ComprehensiveStats from '@/components/analytics/ComprehensiveStats';
import DetailedCharts from '@/components/analytics/DetailedCharts';
import TradeList from '@/components/trading/TradeList';
import AITradeAnalysis from '@/components/analytics/AITradeAnalysis';
import AISummaryGenerator from '@/components/summaries/AISummaryGenerator';
import { useChartDarkMode, chartCard, chartTitle } from '@/components/charts/chartTheme';

export default function Reports() {
  const darkMode = useChartDarkMode();
  const [view, setView] = useState('overview');
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [period, setPeriod] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { selectedAccountIds, hasSelection } = useSelectedAccounts();

  const { data: allTrades = [], isLoading } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-entry_date', 1000)
  });

  const trades = hasSelection
    ? allTrades.filter(t => selectedAccountIds.includes(t.account_id))
    : allTrades;

  const { start, end } = useMemo(() => {
    const date = new Date(selectedDate);
    if (period === 'daily') {
      const s = new Date(date); s.setHours(0, 0, 0, 0);
      const e = new Date(date); e.setHours(23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    if (period === 'weekly') {
      const dow = date.getDay();
      const s = new Date(date); s.setDate(date.getDate() - dow); s.setHours(0, 0, 0, 0);
      const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999);
      return { start: s.toISOString(), end: e.toISOString() };
    }
    const s = new Date(date.getFullYear(), date.getMonth(), 1); s.setHours(0, 0, 0, 0);
    const e = new Date(date.getFullYear(), date.getMonth() + 1, 0); e.setHours(23, 59, 59, 999);
    return { start: s.toISOString(), end: e.toISOString() };
  }, [period, selectedDate]);

  const periodTrades = useMemo(() => trades.filter(t => {
    const d = new Date(t.entry_date);
    return d >= new Date(start) && d <= new Date(end);
  }), [trades, start, end]);

  const changeDate = (step) => {
    const date = new Date(selectedDate);
    if (period === 'daily') date.setDate(date.getDate() + step);
    else if (period === 'weekly') date.setDate(date.getDate() + (step * 7));
    else date.setMonth(date.getMonth() + step);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const formatDateRange = () => {
    const s = new Date(start), e = new Date(end);
    if (period === 'daily') return s.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (period === 'weekly') return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    return s.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const tabCls = `data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-500 data-[state=active]:to-purple-600 data-[state=active]:text-white ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`;

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <GlobalAccountSelector />

        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'} bg-clip-text text-transparent`}>
              Reports
            </h1>
            <p className={`mt-1 ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
              AI insights, performance analytics, and trading summaries — all in one place
            </p>
          </div>
          {trades.length > 0 && (
            <Button onClick={() => setShowAIAnalysis(true)} className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
              <Brain className="h-5 w-5 mr-2" /> Full AI Analysis
            </Button>
          )}
        </div>

        <Tabs value={view} onValueChange={setView} className="space-y-6">
          <TabsList className={`${darkMode ? 'bg-slate-950/80 border border-cyan-500/20' : 'bg-white border border-cyan-500/30'} flex flex-wrap h-auto`}>
            <TabsTrigger value="overview" className={`flex items-center gap-2 ${tabCls}`}><Brain className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="summaries" className={`flex items-center gap-2 ${tabCls}`}><FileText className="h-4 w-4" /> Summaries</TabsTrigger>
            <TabsTrigger value="stats" className={`flex items-center gap-2 ${tabCls}`}><BarChart3 className="h-4 w-4" /> Statistics</TabsTrigger>
            <TabsTrigger value="charts" className={`flex items-center gap-2 ${tabCls}`}><TrendingUp className="h-4 w-4" /> Charts</TabsTrigger>
            <TabsTrigger value="trades" className={`flex items-center gap-2 ${tabCls}`}><Table className="h-4 w-4" /> Trade History</TabsTrigger>
          </TabsList>

          {/* Overview — AI insights + performance + advanced charts */}
          <TabsContent value="overview" className="space-y-6">
            <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'}>
              <div className="p-6 flex items-start gap-3">
                <Brain className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                <div>
                  <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI-Enhanced Reports</h3>
                  <ul className={`text-sm space-y-1 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <li>✓ Intelligent pattern recognition and profitable trade identification</li>
                    <li>✓ Risk prediction and emotional impact analysis</li>
                    <li>✓ Personalized strategy recommendations</li>
                    <li>✓ Advanced charting: distributions, drawdown, correlations</li>
                  </ul>
                </div>
              </div>
            </Card>
            <AIInsightsPanel trades={trades} />
            <PerformanceMetrics trades={trades} detailed />
            <AdvancedCharts trades={trades} />
          </TabsContent>

          {/* Summaries — AI summary generator with period selector */}
          <TabsContent value="summaries" className="space-y-6">
            <Card className={chartCard(darkMode)}>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <FileText className={`h-5 w-5 mt-0.5 ${darkMode ? 'text-cyan-400' : 'text-purple-600'}`} />
                  <div className="flex-1">
                    <h3 className={`font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>AI-Powered Trading Summaries</h3>
                    <p className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Get automated daily, weekly, and monthly summaries highlighting key metrics, significant trades,
                      psychological insights, and actionable recommendations based on your trading activity.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Period Selector */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex gap-2">
                {['daily', 'weekly', 'monthly'].map((p) => (
                  <Button key={p} variant={period === p ? 'default' : 'outline'} onClick={() => setPeriod(p)}
                    className={period === p ? 'bg-gradient-to-r from-cyan-500 to-purple-600' : ''}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => changeDate(-1)}>← Previous</Button>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-slate-200'}`}>
                  <Calendar className={`h-4 w-4 ${darkMode ? 'text-cyan-400' : 'text-slate-600'}`} />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{formatDateRange()}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => changeDate(1)}>Next →</Button>
              </div>
            </div>

            <Card className={chartCard(darkMode)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Trades in this period</div>
                    <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{periodTrades.length}</div>
                  </div>
                  {isLoading && <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${darkMode ? 'border-cyan-500' : 'border-blue-600'}`} />}
                </div>
              </CardContent>
            </Card>

            {!isLoading && (
              <AISummaryGenerator trades={periodTrades} period={period} startDate={new Date(start).toLocaleDateString()} endDate={new Date(end).toLocaleDateString()} />
            )}

            {periodTrades.length === 0 && !isLoading && (
              <Card className={chartCard(darkMode)}>
                <CardContent className="p-12 text-center">
                  <FileText className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-slate-700' : 'text-slate-300'}`} />
                  <p className={`font-medium ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No trades found for this period</p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>Try selecting a different date or time period</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Statistics */}
          <TabsContent value="stats" className="space-y-6">
            <ComprehensiveStats trades={trades} />
          </TabsContent>

          {/* Charts */}
          <TabsContent value="charts" className="space-y-6">
            <DetailedCharts trades={trades} />
          </TabsContent>

          {/* Trade History */}
          <TabsContent value="trades" className="space-y-6">
            <Card className={chartCard(darkMode)}>
              <div className="p-6">
                <TradeList trades={trades} showFilters />
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {showAIAnalysis && <AITradeAnalysis trades={trades} onClose={() => setShowAIAnalysis(false)} />}
      </div>
    </div>
  );
}