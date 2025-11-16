import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, RefreshCw, TrendingUp, BarChart3 } from 'lucide-react';
import AIInsightsPanel from '@/components/analytics/AIInsightsPanel';
import {
  TradeDistributionChart,
  DrawdownChart,
  PnLDistributionChart,
  SymbolCorrelationChart,
  StreakAnalysisChart
} from '@/components/analytics/AdvancedCharts';
import {
  generateAIInsights,
  identifyProfitablePatterns,
  analyzeEmotionalImpact,
  predictRisks
} from '@/components/analytics/AIInsightsEngine';
import PerformanceMetrics from '@/components/trading/PerformanceMetrics';

export default function Analytics() {
  const [aiInsights, setAiInsights] = useState(null);
  const [patterns, setPatterns] = useState([]);
  const [risks, setRisks] = useState([]);
  const [emotionalAnalysis, setEmotionalAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { data: trades = [] } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-entry_date', 1000)
  });

  const { data: strategies = [] } = useQuery({
    queryKey: ['strategies'],
    queryFn: () => base44.entities.Strategy.list('-created_date', 100)
  });

  const runAIAnalysis = async () => {
    if (trades.length < 5) {
      alert('Need at least 5 trades to run AI analysis');
      return;
    }

    setAnalyzing(true);
    try {
      const [insights, patternsData, risksData, emotionalData] = await Promise.all([
        generateAIInsights(trades, strategies),
        identifyProfitablePatterns(trades),
        predictRisks(trades, trades.slice(0, 20)),
        analyzeEmotionalImpact(trades)
      ]);

      setAiInsights(insights);
      setPatterns(patternsData);
      setRisks(risksData);
      setEmotionalAnalysis(emotionalData);
    } catch (error) {
      console.error('AI analysis error:', error);
      alert('AI analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Advanced Analytics</h1>
            <p className="text-slate-600 mt-1">AI-powered insights and performance analysis</p>
          </div>
          <Button
            onClick={runAIAnalysis}
            disabled={analyzing || trades.length < 5}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {analyzing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Run AI Analysis
              </>
            )}
          </Button>
        </div>

        {/* AI Analysis Banner */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Brain className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <h3 className="font-bold text-slate-900 mb-2">AI-Powered Analytics</h3>
                <ul className="text-sm text-slate-700 space-y-1">
                  <li>✓ Identify profitable trading patterns automatically</li>
                  <li>✓ Predict potential risks before they impact your account</li>
                  <li>✓ Analyze emotional impact on trading performance</li>
                  <li>✓ Get personalized recommendations for strategy improvement</li>
                  <li>✓ Advanced charting for deep performance analysis</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="ai-insights" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="ai-insights">
              <Brain className="h-4 w-4 mr-2" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="performance">
              <TrendingUp className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="advanced-charts">
              <BarChart3 className="h-4 w-4 mr-2" />
              Advanced Charts
            </TabsTrigger>
          </TabsList>

          {/* AI Insights Tab */}
          <TabsContent value="ai-insights">
            {aiInsights || patterns.length > 0 || risks.length > 0 || emotionalAnalysis ? (
              <AIInsightsPanel
                insights={aiInsights}
                patterns={patterns}
                risks={risks}
                emotionalAnalysis={emotionalAnalysis}
              />
            ) : (
              <Card className="p-12 text-center">
                <Brain className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">No AI Analysis Yet</h3>
                <p className="text-slate-600 mb-6">
                  Click "Run AI Analysis" to get comprehensive insights into your trading performance
                </p>
                <Button
                  onClick={runAIAnalysis}
                  disabled={analyzing || trades.length < 5}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Get Started
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance">
            <PerformanceMetrics trades={trades} />
          </TabsContent>

          {/* Advanced Charts Tab */}
          <TabsContent value="advanced-charts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TradeDistributionChart trades={trades} />
              <DrawdownChart trades={trades} />
              <PnLDistributionChart trades={trades} />
              <StreakAnalysisChart trades={trades} />
              <div className="lg:col-span-2">
                <SymbolCorrelationChart trades={trades} />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}