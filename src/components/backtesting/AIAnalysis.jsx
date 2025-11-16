import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Target, AlertTriangle, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

export default function AIAnalysis({ backtest, onOptimize }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const prompt = `As a quantitative trading analyst, analyze this backtest performance and provide optimization recommendations:

Backtest Results:
- Strategy: ${backtest.name}
- Symbol: ${backtest.symbol}
- Timeframe: ${backtest.timeframe}
- Total Return: ${backtest.total_return?.toFixed(2)}%
- Win Rate: ${backtest.win_rate?.toFixed(1)}%
- Profit Factor: ${backtest.profit_factor?.toFixed(2)}
- Max Drawdown: ${backtest.max_drawdown?.toFixed(2)}%
- Total Trades: ${backtest.total_trades}
- Avg Win: $${backtest.avg_win?.toFixed(2)}
- Avg Loss: $${backtest.avg_loss?.toFixed(2)}

Strategy Rules:
- Entry: ${backtest.entry_rules}
- Exit: ${backtest.exit_rules}

Provide:
1. **Performance Assessment**: Overall strategy evaluation (Excellent/Good/Needs Improvement/Poor)
2. **Key Strengths**: What's working well (2-3 points)
3. **Weaknesses**: What needs improvement (2-3 points)
4. **Optimization Suggestions**: Specific parameter adjustments to improve performance
   - Suggested stop-loss/take-profit changes
   - Entry/exit condition refinements
   - Risk management improvements
5. **Market Fit**: Is this strategy suitable for the symbol and timeframe?

Use markdown formatting. Be specific and actionable.`;

      const result = await base44.integrations.Core.InvokeLLM({ prompt });
      setAnalysis(result);
    } catch (error) {
      console.error('AI Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateAnalysis();
  }, [backtest.id]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <CardTitle>AI Performance Analysis</CardTitle>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={generateAnalysis} disabled={loading} variant="outline">
            <Loader2 className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {onOptimize && (
            <Button size="sm" onClick={onOptimize} className="bg-purple-600 hover:bg-purple-700">
              <Target className="h-4 w-4 mr-1" />
              Auto-Optimize
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {loading && !analysis ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : analysis ? (
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown
              components={{
                h2: ({children}) => (
                  <h2 className="text-base font-bold text-slate-900 mt-4 mb-2 flex items-center gap-2">
                    {children.toString().includes('Performance') && <TrendingUp className="h-5 w-5 text-blue-600" />}
                    {children.toString().includes('Strengths') && <Target className="h-5 w-5 text-green-600" />}
                    {children.toString().includes('Weaknesses') && <AlertTriangle className="h-5 w-5 text-red-600" />}
                    {children.toString().includes('Optimization') && <Sparkles className="h-5 w-5 text-purple-600" />}
                    {children}
                  </h2>
                ),
                ul: ({children}) => <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">{children}</ul>,
                strong: ({children}) => <strong className="font-semibold text-slate-900">{children}</strong>,
                p: ({children}) => <p className="text-sm text-slate-700 my-2">{children}</p>
              }}
            >
              {analysis}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">No analysis available</p>
        )}
      </CardContent>
    </Card>
  );
}