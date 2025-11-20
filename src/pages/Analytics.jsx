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

export default function Analytics() {
  const [view, setView] = useState('overview');

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Advanced Analytics</h1>
          <p className="text-slate-600 mt-1">Comprehensive performance analysis and detailed statistics</p>
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
      </div>
    </div>
  );
}