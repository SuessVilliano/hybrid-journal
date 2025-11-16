import React from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { BarChart3, Brain } from 'lucide-react';
import AIInsightsPanel from '@/components/analytics/AIInsightsPanel';
import AdvancedCharts from '@/components/analytics/AdvancedCharts';
import PerformanceMetrics from '@/components/trading/PerformanceMetrics';

export default function Analytics() {
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
          <p className="text-slate-600 mt-1">AI-powered insights and comprehensive performance analysis</p>
        </div>

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
      </div>
    </div>
  );
}