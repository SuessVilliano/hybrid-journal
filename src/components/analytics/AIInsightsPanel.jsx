import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, TrendingUp, AlertTriangle, Heart, Target, Loader2, Layers } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';
import ProviderChip from '@/components/journal/ProviderChip';

export default function AIInsightsPanel({ trades }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [crossPlatform, setCrossPlatform] = useState(null);
  const [crossPlatformLoading, setCrossPlatformLoading] = useState(false);

  const loadCrossPlatform = async () => {
    setCrossPlatformLoading(true);
    try {
      const resp = await base44.functions.invoke('aiCompareProviders', {});
      setCrossPlatform(resp.data);
    } catch (err) {
      console.error('aiCompareProviders failed:', err);
    } finally {
      setCrossPlatformLoading(false);
    }
  };

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

  useEffect(() => {
    loadCrossPlatform();
  }, []);

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
        {/* Cross-platform comparison (HybridCopy providers) */}
        {(crossPlatformLoading || crossPlatform?.summaries?.length > 0) && (
          <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-cyan-600" />
              <h3 className="text-sm font-semibold text-slate-900">
                Cross-Platform Performance (MTD)
              </h3>
            </div>
            {crossPlatformLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <>
                {crossPlatform?.narrative && (
                  <p className="text-sm text-slate-700 mb-3 whitespace-pre-line">
                    {crossPlatform.narrative}
                  </p>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {crossPlatform.summaries.map((s, i) => (
                    <div
                      key={`${s.provider}-${s.symbol_class}-${i}`}
                      className="rounded-md bg-white p-2 border border-slate-200"
                    >
                      <ProviderChip
                        trade={{ provider: s.provider.toUpperCase().replace(/\s+/g, '_') }}
                        size="xs"
                      />
                      <div className="mt-1 text-xs text-slate-500">{s.symbol_class}</div>
                      <div
                        className={`text-sm font-bold ${
                          (s.mtd_pnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {(s.mtd_pnl || 0) >= 0 ? '+' : ''}${(s.mtd_pnl || 0).toFixed(2)}
                        {s.mtd_pct != null && (
                          <span className="ml-1 text-[10px] font-normal text-slate-500">
                            ({s.mtd_pct >= 0 ? '+' : ''}{s.mtd_pct.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{s.trades} trades</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

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