import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertTriangle, Heart, Target, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

export default function AIInsightsPanel({ trades }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const tradeStats = {
        total: trades.length,
        wins: trades.filter(t => t.pnl > 0).length,
        losses: trades.filter(t => t.pnl < 0).length,
        totalPnl: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
        avgWin: trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0) / trades.filter(t => t.pnl > 0).length || 0,
        avgLoss: Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0) / trades.filter(t => t.pnl < 0).length || 0),
        emotions: trades.map(t => ({ before: t.emotion_before, after: t.emotion_after, pnl: t.pnl })).filter(e => e.before),
        strategies: trades.filter(t => t.strategy).map(t => ({ strategy: t.strategy, pnl: t.pnl }))
      };

      const prompt = `As a professional trading analyst, analyze this trading performance and provide actionable insights:

Trading Statistics:
- Total Trades: ${tradeStats.total}
- Win Rate: ${((tradeStats.wins / tradeStats.total) * 100).toFixed(1)}%
- Total P&L: $${tradeStats.totalPnl.toFixed(2)}
- Average Win: $${tradeStats.avgWin.toFixed(2)}
- Average Loss: $${tradeStats.avgLoss.toFixed(2)}

Provide analysis on:
1. **Profitable Patterns**: Identify what's working (best strategies, symbols, setups)
2. **Risk Areas**: Highlight potential risks and losing patterns
3. **Emotional Impact**: How emotions correlate with performance
4. **Strategy Recommendations**: 3 specific improvements

Use markdown formatting with headers, bullet points, and emphasis. Be direct and actionable.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setInsights(result);
    } catch (error) {
      console.error('Insights generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trades.length > 0) {
      generateInsights();
    }
  }, [trades]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle>AI Performance Insights</CardTitle>
        </div>
        <Button size="sm" onClick={generateInsights} disabled={loading}>
          <Loader2 className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading && !insights ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : insights ? (
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown
              components={{
                h2: ({children}) => <h2 className="text-lg font-bold text-slate-900 mt-4 mb-2 flex items-center gap-2">
                  {children.toString().includes('Profitable') && <TrendingUp className="h-5 w-5 text-green-600" />}
                  {children.toString().includes('Risk') && <AlertTriangle className="h-5 w-5 text-red-600" />}
                  {children.toString().includes('Emotional') && <Heart className="h-5 w-5 text-purple-600" />}
                  {children.toString().includes('Recommendations') && <Target className="h-5 w-5 text-blue-600" />}
                  {children}
                </h2>,
                ul: ({children}) => <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">{children}</ul>,
                strong: ({children}) => <strong className="font-semibold text-slate-900">{children}</strong>
              }}
            >
              {insights}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No insights available yet</p>
        )}
      </CardContent>
    </Card>
  );
}