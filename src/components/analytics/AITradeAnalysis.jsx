import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, TrendingUp, AlertTriangle, Target, Loader2, X, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AITradeAnalysis({ trades, onClose }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const darkMode = document.documentElement.classList.contains('dark');

  const generateAnalysis = async () => {
    setAnalyzing(true);
    
    try {
      const winningTrades = trades.filter(t => t.pnl > 0);
      const losingTrades = trades.filter(t => t.pnl < 0);
      
      const stats = {
        total: trades.length,
        winning: winningTrades.length,
        losing: losingTrades.length,
        winRate: ((winningTrades.length / trades.length) * 100).toFixed(1),
        avgWin: winningTrades.reduce((sum, t) => sum + t.pnl, 0) / (winningTrades.length || 1),
        avgLoss: Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / (losingTrades.length || 1)),
        totalPnl: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
        emotions: trades.filter(t => t.emotion_before || t.emotion_during || t.emotion_after).length,
        withStrategy: trades.filter(t => t.strategy).length
      };

      const emotionData = trades.reduce((acc, t) => {
        if (t.emotion_before) {
          if (!acc[t.emotion_before]) acc[t.emotion_before] = { trades: 0, pnl: 0 };
          acc[t.emotion_before].trades++;
          acc[t.emotion_before].pnl += t.pnl || 0;
        }
        return acc;
      }, {});

      const strategyData = trades.reduce((acc, t) => {
        if (t.strategy) {
          if (!acc[t.strategy]) acc[t.strategy] = { trades: 0, wins: 0, pnl: 0 };
          acc[t.strategy].trades++;
          if (t.pnl > 0) acc[t.strategy].wins++;
          acc[t.strategy].pnl += t.pnl || 0;
        }
        return acc;
      }, {});

      const symbolData = trades.reduce((acc, t) => {
        if (!acc[t.symbol]) acc[t.symbol] = { trades: 0, wins: 0, pnl: 0 };
        acc[t.symbol].trades++;
        if (t.pnl > 0) acc[t.symbol].wins++;
        acc[t.symbol].pnl += t.pnl || 0;
        return acc;
      }, {});

      const prompt = `You are an expert trading analyst. Analyze the following trading performance data and provide comprehensive insights:

**Performance Statistics:**
- Total Trades: ${stats.total}
- Win Rate: ${stats.winRate}%
- Winning Trades: ${stats.winning} (Avg: $${stats.avgWin.toFixed(2)})
- Losing Trades: ${stats.losing} (Avg: -$${stats.avgLoss.toFixed(2)})
- Total P&L: $${stats.totalPnl.toFixed(2)}
- Profit Factor: ${((stats.avgWin * stats.winning) / (stats.avgLoss * stats.losing || 1)).toFixed(2)}

**Emotion Analysis:**
${Object.entries(emotionData).map(([emotion, data]) => 
  `- ${emotion}: ${data.trades} trades, Avg P&L: $${(data.pnl / data.trades).toFixed(2)}`
).join('\n')}

**Strategy Performance:**
${Object.entries(strategyData).map(([strategy, data]) => 
  `- ${strategy}: ${data.trades} trades, ${((data.wins/data.trades)*100).toFixed(1)}% win rate, P&L: $${data.pnl.toFixed(2)}`
).join('\n')}

**Top Symbols:**
${Object.entries(symbolData).sort((a,b) => b[1].pnl - a[1].pnl).slice(0, 5).map(([symbol, data]) => 
  `- ${symbol}: ${data.trades} trades, ${((data.wins/data.trades)*100).toFixed(1)}% win rate, P&L: $${data.pnl.toFixed(2)}`
).join('\n')}

Provide a detailed analysis report with the following sections:

## 🎯 Key Patterns Identified
Identify winning and losing patterns in trades (instruments, strategies, timeframes, emotions).

## 📊 Strategy Effectiveness
Evaluate which strategies are working and which need improvement.

## 🧠 Emotional & Behavioral Analysis  
Analyze how emotions correlate with trading outcomes and identify problematic patterns.

## ⚠️ Risk Management Assessment
Evaluate risk/reward ratios, position sizing, and stop-loss effectiveness.

## 💡 Actionable Recommendations
Provide 5-7 specific, actionable recommendations to improve trading performance.

## 🎓 Next Steps
Suggest concrete action items for immediate implementation.

Be specific, data-driven, and provide clear reasoning for each insight.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setAnalysis(result);
    } catch (error) {
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className={`max-w-5xl w-full my-8 ${
        darkMode ? 'bg-slate-950 border-cyan-500/30' : 'bg-white border-cyan-500/40'
      }`}>
        <CardHeader className={`border-b ${darkMode ? 'border-cyan-500/20' : 'border-cyan-500/30'} sticky top-0 z-10 ${
          darkMode ? 'bg-slate-950' : 'bg-white'
        }`}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className={darkMode ? 'text-white' : 'text-slate-900'}>
                  AI Trade Analysis
                </CardTitle>
                <p className={`text-sm ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
                  Analyzing {trades.length} trades
                </p>
              </div>
            </div>
            <button onClick={onClose} className={`${darkMode ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'} transition`}>
              <X className="h-6 w-6" />
            </button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {!analysis && !analyzing && (
            <div className="text-center py-12">
              <Brain className={`h-16 w-16 mx-auto mb-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Ready to Analyze Your Trades
              </h3>
              <p className={`mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Get AI-powered insights on patterns, strategies, emotions, and risk management
              </p>
              <Button 
                onClick={generateAnalysis}
                className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
              >
                <Brain className="h-5 w-5 mr-2" />
                Generate Analysis Report
              </Button>
            </div>
          )}

          {analyzing && (
            <div className="text-center py-12">
              <Loader2 className={`h-16 w-16 mx-auto mb-4 animate-spin ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Analyzing Your Trading Performance...
              </h3>
              <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                This may take 15-30 seconds
              </p>
            </div>
          )}

          {analysis && (
            <div className={`prose max-w-none ${darkMode ? 'prose-invert' : ''}`}>
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className={`text-2xl font-bold mt-6 mb-4 flex items-center gap-2 ${
                      darkMode ? 'text-cyan-400' : 'text-cyan-700'
                    }`}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className={`text-xl font-semibold mt-4 mb-2 ${
                      darkMode ? 'text-purple-400' : 'text-purple-700'
                    }`}>
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className={`mb-3 leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className={`list-disc ml-6 mb-4 space-y-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>{children}</strong>
                  )
                }}
              >
                {analysis}
              </ReactMarkdown>

              <div className="mt-8 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setAnalysis(null)} className={darkMode ? 'border-cyan-500/30 text-cyan-400' : ''}>
                  Generate New Analysis
                </Button>
                <Button onClick={onClose} className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700">
                  Close
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}