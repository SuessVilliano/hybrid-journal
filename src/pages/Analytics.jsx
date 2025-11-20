import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Brain, TrendingUp, Table } from 'lucide-react';
import AIInsightsPanel from '@/components/analytics/AIInsightsPanel';
import AdvancedCharts from '@/components/analytics/AdvancedCharts';
import PerformanceMetrics from '@/components/trading/PerformanceMetrics';
import ComprehensiveStats from '@/components/analytics/ComprehensiveStats';
import DetailedCharts from '@/components/analytics/DetailedCharts';
import TradeList from '@/components/trading/TradeList';
import AITradeAnalysis from '@/components/analytics/AITradeAnalysis';
import { Button } from '@/components/ui/button';

export default function Analytics() {
  const [view, setView] = useState('overview');
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const darkMode = document.documentElement.classList.contains('dark');

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-entry_date', 1000)
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`text-4xl font-bold bg-gradient-to-r ${
              darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
            } bg-clip-text text-transparent`}>
              Advanced Analytics
            </h1>
            <p className={`mt-1 ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
              Comprehensive performance analysis and detailed statistics
            </p>
          </div>
          {trades.length > 0 && (
            <Button 
              onClick={() => setShowAIAnalysis(true)} 
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
            >
              <Brain className="h-5 w-5 mr-2" />
              Full AI Analysis
            </Button>
          )}
        </div>

        <Tabs value={view} onValueChange={setView} className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Comprehensive Stats
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Detailed Charts
            </TabsTrigger>
            <TabsTrigger value="trades" className="flex items-center gap-2">
              <Table className="h-4 w-4" />
              Trade History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <div className="p-6 flex items-start gap-3">
                <Brain className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">AI-Enhanced Analytics</h3>
                  <ul className="text-sm text-slate-700 space-y-1">
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

          <TabsContent value="stats">
            <ComprehensiveStats trades={trades} />
          </TabsContent>

          <TabsContent value="charts">
            <DetailedCharts trades={trades} />
          </TabsContent>

          <TabsContent value="trades">
            <Card>
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