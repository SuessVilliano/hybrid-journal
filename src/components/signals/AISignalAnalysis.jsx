import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AISignalAnalysis({ signal, isOpen, onClose }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const darkMode = document.documentElement.classList.contains('dark');

  React.useEffect(() => {
    if (isOpen && !analysis) {
      analyzeSignal();
    }
  }, [isOpen]);

  const analyzeSignal = async () => {
    setLoading(true);
    try {
      const prompt = `Analyze this trading signal and provide insights:

Symbol: ${signal.symbol}
Action: ${signal.action}
Entry Price: ${signal.price}
Stop Loss: ${signal.stop_loss}
Take Profit(s): ${signal.take_profits?.join(', ') || signal.take_profit}
Provider: ${signal.provider}
Timeframe: ${signal.timeframe || 'Not specified'}
Confidence: ${signal.confidence}%

Provide:
1. **Why This Signal Was Generated**: Explain the likely market conditions or technical patterns
2. **Key Indicators**: What technical indicators or market factors support this move
3. **Risk Assessment**: Evaluate the risk/reward ratio and potential concerns
4. **Trade Management**: Suggestions for entry, exit, and position sizing

Keep it concise and actionable.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      setAnalysis(result);
    } catch (error) {
      setAnalysis('Failed to generate analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-3xl max-h-[80vh] overflow-y-auto ${
        darkMode ? 'bg-slate-950 border-cyan-500/30' : 'bg-white'
      }`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${
            darkMode ? 'text-cyan-400' : 'text-cyan-700'
          }`}>
            <Brain className="h-5 w-5" />
            AI Signal Analysis: {signal.symbol}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Signal Summary */}
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-slate-900/50 border border-cyan-500/20' : 'bg-slate-50 border border-slate-200'
          }`}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Action:</span>
                <span className={`ml-2 font-bold ${
                  signal.action === 'BUY' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {signal.action}
                </span>
              </div>
              <div>
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Entry:</span>
                <span className={`ml-2 font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  ${signal.price}
                </span>
              </div>
              <div>
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Provider:</span>
                <span className={`ml-2 font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  {signal.provider}
                </span>
              </div>
              <div>
                <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Confidence:</span>
                <span className={`ml-2 font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  {signal.confidence}%
                </span>
              </div>
            </div>
          </div>

          {/* Analysis Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className={`h-12 w-12 animate-spin mb-4 ${
                darkMode ? 'text-cyan-400' : 'text-cyan-600'
              }`} />
              <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                Analyzing signal with AI...
              </p>
            </div>
          ) : analysis ? (
            <div className={`prose max-w-none ${darkMode ? 'prose-invert' : ''}`}>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className={`text-xl font-bold mb-3 ${
                      darkMode ? 'text-cyan-400' : 'text-cyan-700'
                    }`}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className={`text-lg font-bold mb-2 ${
                      darkMode ? 'text-cyan-400' : 'text-cyan-700'
                    }`}>
                      {children}
                    </h2>
                  ),
                  p: ({ children }) => (
                    <p className={`mb-3 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className={`list-disc ml-6 mb-3 ${
                      darkMode ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {children}
                    </ul>
                  ),
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  strong: ({ children }) => (
                    <strong className={darkMode ? 'text-white' : 'text-slate-900'}>
                      {children}
                    </strong>
                  ),
                }}
              >
                {analysis}
              </ReactMarkdown>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-700">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}