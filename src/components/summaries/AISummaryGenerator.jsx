import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Calendar, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

export default function AISummaryGenerator({ trades, period = 'daily', startDate, endDate }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    setLoading(true);
    try {
      // Calculate key metrics
      const totalTrades = trades.length;
      const winningTrades = trades.filter(t => t.pnl > 0);
      const losingTrades = trades.filter(t => t.pnl < 0);
      const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades * 100) : 0;
      const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
      const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0;
      
      const topTrade = trades.length > 0 ? trades.reduce((max, t) => t.pnl > max.pnl ? t : max, trades[0]) : null;
      const worstTrade = trades.length > 0 ? trades.reduce((min, t) => t.pnl < min.pnl ? t : min, trades[0]) : null;
      
      const strategies = [...new Set(trades.filter(t => t.strategy).map(t => t.strategy))];
      const symbols = [...new Set(trades.map(t => t.symbol))];
      
      const emotions = trades.filter(t => t.emotion_after).map(t => t.emotion_after);
      const emotionCounts = emotions.reduce((acc, e) => {
        acc[e] = (acc[e] || 0) + 1;
        return acc;
      }, {});
      
      const mistakes = trades.filter(t => t.mistakes_made?.length > 0)
        .flatMap(t => t.mistakes_made);
      
      const disciplineStats = {
        followed: trades.filter(t => t.followed_rules === true).length,
        total: trades.filter(t => t.followed_rules !== null && t.followed_rules !== undefined).length
      };

      const prompt = `As an expert trading analyst and coach, generate a comprehensive ${period} trading summary for the period ${startDate} to ${endDate}.

**Trading Performance:**
- Total Trades: ${totalTrades}
- Winning Trades: ${winningTrades.length}
- Losing Trades: ${losingTrades.length}
- Win Rate: ${winRate.toFixed(1)}%
- Total P&L: $${totalPnL.toFixed(2)}
- Average Win: $${avgWin.toFixed(2)}
- Average Loss: $${avgLoss.toFixed(2)}
${topTrade ? `- Best Trade: ${topTrade.symbol} (${topTrade.side}) - $${topTrade.pnl.toFixed(2)}` : ''}
${worstTrade ? `- Worst Trade: ${worstTrade.symbol} (${worstTrade.side}) - $${worstTrade.pnl.toFixed(2)}` : ''}

**Trading Activity:**
- Symbols Traded: ${symbols.join(', ')}
- Strategies Used: ${strategies.length > 0 ? strategies.join(', ') : 'Various'}
${disciplineStats.total > 0 ? `- Rule Adherence: ${disciplineStats.followed}/${disciplineStats.total} (${(disciplineStats.followed/disciplineStats.total*100).toFixed(0)}%)` : ''}

**Psychology & Behavior:**
${Object.keys(emotionCounts).length > 0 ? `- Most Common Emotions: ${Object.entries(emotionCounts).sort((a,b) => b[1]-a[1]).slice(0,3).map(([e,c]) => `${e} (${c})`).join(', ')}` : ''}
${mistakes.length > 0 ? `- Common Mistakes: ${[...new Set(mistakes)].slice(0,3).join(', ')}` : ''}

Generate a trading summary with the following sections (use markdown formatting):

## 📊 Performance Overview
Brief assessment of overall performance (1-2 sentences)

## 🎯 Key Highlights
- 3-4 bullet points of notable achievements or events

## ⚠️ Areas for Improvement
- 2-3 specific areas that need attention

## 🧠 Psychological Insights
Analysis of emotional patterns and discipline

## 💡 Recommendations
- 3-4 actionable recommendations for next ${period === 'daily' ? 'day' : 'week'}

Keep it concise, supportive, and actionable. Focus on growth and learning.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      
      setSummary({
        content: result,
        metrics: {
          totalTrades,
          winRate: winRate.toFixed(1),
          totalPnL: totalPnL.toFixed(2),
          winningTrades: winningTrades.length,
          losingTrades: losingTrades.length
        },
        topTrade,
        worstTrade,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Summary generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle>
            AI {period === 'daily' ? 'Daily' : 'Weekly'} Summary
          </CardTitle>
        </div>
        <Button size="sm" onClick={generateSummary} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-1" />
              Generate Summary
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent>
        {loading && !summary ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mb-4" />
            <p className="text-slate-600">Analyzing your trading data...</p>
          </div>
        ) : summary ? (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">Total Trades</div>
                <div className="text-xl font-bold text-slate-900">{summary.metrics.totalTrades}</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">Win Rate</div>
                <div className="text-xl font-bold text-blue-900">{summary.metrics.winRate}%</div>
              </div>
              <div className={`p-3 rounded-lg ${parseFloat(summary.metrics.totalPnL) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="text-xs text-slate-600 mb-1">Total P&L</div>
                <div className={`text-xl font-bold ${parseFloat(summary.metrics.totalPnL) >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                  ${summary.metrics.totalPnL}
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-xs text-slate-600 mb-1">W/L</div>
                <div className="text-xl font-bold text-purple-900">
                  {summary.metrics.winningTrades}/{summary.metrics.losingTrades}
                </div>
              </div>
            </div>

            {/* Significant Trades */}
            {(summary.topTrade || summary.worstTrade) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {summary.topTrade && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-bold text-green-900">Best Trade</span>
                    </div>
                    <div className="text-sm text-slate-700">
                      <div>{summary.topTrade.symbol} - {summary.topTrade.side}</div>
                      <div className="text-lg font-bold text-green-600 mt-1">
                        +${summary.topTrade.pnl.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
                {summary.worstTrade && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="font-bold text-red-900">Worst Trade</span>
                    </div>
                    <div className="text-sm text-slate-700">
                      <div>{summary.worstTrade.symbol} - {summary.worstTrade.side}</div>
                      <div className="text-lg font-bold text-red-600 mt-1">
                        ${summary.worstTrade.pnl.toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* AI Analysis */}
            <div className="prose prose-slate max-w-none">
              <ReactMarkdown
                components={{
                  h2: ({children}) => (
                    <h2 className="text-lg font-bold text-slate-900 mt-6 mb-3 flex items-center gap-2">
                      {children}
                    </h2>
                  ),
                  ul: ({children}) => <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 my-2">{children}</ul>,
                  strong: ({children}) => <strong className="font-semibold text-slate-900">{children}</strong>,
                  p: ({children}) => <p className="text-sm text-slate-700 my-2">{children}</p>
                }}
              >
                {summary.content}
              </ReactMarkdown>
            </div>

            <div className="text-xs text-slate-500 text-center pt-4 border-t border-slate-200">
              Generated on {new Date(summary.generated_at).toLocaleString()}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-1">No summary generated yet</p>
            <p className="text-sm text-slate-500">
              Click "Generate Summary" to analyze {trades.length} trade{trades.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}