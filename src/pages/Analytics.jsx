import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import AIInsights from '@/components/analytics/AIInsights';
import PerformanceMetrics from '@/components/trading/PerformanceMetrics';

export default function Analytics() {
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [insights, setInsights] = useState(null);

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['trades'],
    queryFn: () => base44.entities.Trade.list('-entry_date', 1000)
  });

  const generateAIInsights = async () => {
    setGeneratingInsights(true);
    
    try {
      // Prepare trade data for analysis
      const tradeStats = {
        total: trades.length,
        wins: trades.filter(t => t.pnl > 0).length,
        losses: trades.filter(t => t.pnl < 0).length,
        totalPnl: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
        platforms: [...new Set(trades.map(t => t.platform))],
        symbols: [...new Set(trades.map(t => t.symbol))],
        strategies: [...new Set(trades.map(t => t.strategy).filter(Boolean))],
        avgHoldTime: 'varies',
        emotions: trades.filter(t => t.emotion_before).map(t => t.emotion_before)
      };

      const prompt = `You are an expert trading coach analyzing a trader's performance. Here's their data:

Total Trades: ${tradeStats.total}
Wins: ${tradeStats.wins} | Losses: ${tradeStats.losses}
Win Rate: ${tradeStats.total > 0 ? ((tradeStats.wins / tradeStats.total) * 100).toFixed(1) : 0}%
Total P&L: $${tradeStats.totalPnl.toFixed(2)}

Platforms Used: ${tradeStats.platforms.join(', ')}
Top Symbols: ${tradeStats.symbols.slice(0, 5).join(', ')}
Strategies: ${tradeStats.strategies.length > 0 ? tradeStats.strategies.join(', ') : 'Not specified'}
Emotional States Recorded: ${tradeStats.emotions.join(', ')}

Please provide:
1. **Key Strengths** - What is this trader doing well?
2. **Areas for Improvement** - What patterns need attention?
3. **Risk Management Assessment** - How is their risk approach?
4. **Psychological Patterns** - Any emotional trading signs?
5. **Actionable Recommendations** - 3-5 specific steps to improve

Be specific, constructive, and actionable. Format as markdown with clear sections.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      setInsights(result);
    } catch (error) {
      console.error('Error generating insights:', error);
      alert('Failed to generate insights. Please try again.');
    } finally {
      setGeneratingInsights(false);
    }
  };

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
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Advanced Analytics</h1>
            <p className="text-slate-600 mt-1">AI-powered insights and deep performance analysis</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList className="bg-white shadow-sm">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceMetrics trades={trades} detailed />
          </TabsContent>

          <TabsContent value="ai-insights">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-600" />
                  AI Trading Coach
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-medium text-blue-900 mb-1">Get Personalized Insights</h3>
                    <p className="text-sm text-blue-700 mb-3">
                      Our AI will analyze your trading history, identify patterns, and provide actionable recommendations.
                    </p>
                    <Button
                      onClick={generateAIInsights}
                      disabled={generatingInsights || trades.length === 0}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {generatingInsights ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="h-4 w-4 mr-2" />
                          Generate Insights
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {insights && <AIInsights insights={insights} />}

                {trades.length === 0 && (
                  <div className="text-center py-12">
                    <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-600">
                      Add some trades first to get AI insights
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="patterns">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trading Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  Pattern analysis coming soon - identify your winning setups and losing patterns.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}