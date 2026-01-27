import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, AlertTriangle, Zap, Brain, RefreshCw, Send, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function MarketCauseEngine() {
  const [scores, setScores] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const darkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    loadMarketIntel();
    const interval = setInterval(loadMarketIntel, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadMarketIntel = async () => {
    try {
      const response = await base44.functions.invoke('marketCauseEngine', { action: 'scores' });
      setScores(response.data.scores);
      setMarketData(response.data.marketData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load market intel:', error);
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await base44.functions.invoke('marketCauseEngine', { action: 'analyze' });
      setAnalysis(response.data.analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    setAnalyzing(false);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');

    try {
      // Use AI to analyze the query with market context
      const prompt = `You are a market intelligence assistant. The user asked: "${userMessage}"
      
Current Market Context:
- Regime: ${scores?.regime}
- Composite Score: ${scores?.composite?.toFixed(0)}/100
- Macro Pressure: ${scores?.macro?.toFixed(0)}
- Positioning Risk: ${scores?.positioning?.toFixed(0)}
- Catalyst Risk: ${scores?.catalyst?.toFixed(0)}
- 10Y Yield: ${marketData?.macro?.yield_10y}%
- DXY: ${marketData?.macro?.dxy}
- VIX: ${marketData?.macro?.vix}

Provide a concise, actionable response about market conditions and drivers.`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({ prompt });
      
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: aiResponse 
      }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error analyzing the market conditions.' 
      }]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  const regimeColor = {
    'RISK-OFF': 'bg-red-500',
    'CAUTION': 'bg-orange-500',
    'NEUTRAL': 'bg-gray-500',
    'RISK-ON': 'bg-green-500'
  }[scores?.regime] || 'bg-gray-500';

  return (
    <div className="space-y-6">
      {/* Header with Regime */}
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Market Cause Engine
              </h2>
              <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                Real-time causality analysis - Move upstream from price
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={loadMarketIntel} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Badge className={`${regimeColor} text-white text-lg px-4 py-2`}>
                {scores?.regime}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
          <CardContent className="p-6 text-center">
            <div className={`text-sm mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              MACRO PRESSURE
            </div>
            <div className={`text-4xl font-bold ${getScoreColor(scores?.macro)}`}>
              {scores?.macro?.toFixed(0)}
            </div>
          </CardContent>
        </Card>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
          <CardContent className="p-6 text-center">
            <div className={`text-sm mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              POSITIONING
            </div>
            <div className={`text-4xl font-bold ${getScoreColor(scores?.positioning)}`}>
              {scores?.positioning?.toFixed(0)}
            </div>
          </CardContent>
        </Card>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
          <CardContent className="p-6 text-center">
            <div className={`text-sm mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              CATALYST RISK
            </div>
            <div className={`text-4xl font-bold ${getScoreColor(scores?.catalyst)}`}>
              {scores?.catalyst?.toFixed(0)}
            </div>
          </CardContent>
        </Card>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
          <CardContent className="p-6 text-center">
            <div className={`text-sm mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              COMPOSITE
            </div>
            <div className={`text-4xl font-bold ${getScoreColor(scores?.composite)}`}>
              {scores?.composite?.toFixed(0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-600'}>
              Macro Indicators
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricRow label="10Y Yield" value={`${marketData?.macro?.yield_10y}%`} />
            <MetricRow label="2Y Yield" value={`${marketData?.macro?.yield_2y}%`} />
            <MetricRow label="DXY (Dollar)" value={marketData?.macro?.dxy} />
            <MetricRow label="VIX" value={marketData?.macro?.vix} />
            <MetricRow label="Fed Balance Sheet" value={`$${marketData?.macro?.fed_balance_sheet}T`} />
          </CardContent>
        </Card>

        <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
          <CardHeader>
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-600'}>
              Positioning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricRow label="ES Net Position" value={`$${marketData?.positioning?.es_net_position}B`} />
            <MetricRow label="Dealer Gamma" value={marketData?.positioning?.dealer_gamma} />
            <MetricRow label="Put/Call Ratio" value={marketData?.positioning?.put_call_ratio} />
            <MetricRow label="COT Net Long" value={marketData?.positioning?.cot_net_long?.toLocaleString()} />
          </CardContent>
        </Card>
      </div>

      {/* Catalysts */}
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
        <CardHeader>
          <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-600'}>
            Upcoming Catalysts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {marketData?.catalysts?.map((catalyst, idx) => (
              <div 
                key={idx}
                className={`flex justify-between items-center p-3 rounded-lg ${
                  darkMode ? 'bg-slate-900/50' : 'bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className={`h-5 w-5 ${
                    catalyst.impact === 'EXTREME' ? 'text-red-500' :
                    catalyst.impact === 'HIGH' ? 'text-orange-500' :
                    'text-yellow-500'
                  }`} />
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {catalyst.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{catalyst.time}</Badge>
                  <Badge className={
                    catalyst.impact === 'EXTREME' ? 'bg-red-500' :
                    catalyst.impact === 'HIGH' ? 'bg-orange-500' :
                    'bg-yellow-500'
                  }>
                    {catalyst.impact}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Analysis */}
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-600'}>
              AI Market Analysis
            </CardTitle>
            <Button 
              onClick={handleAnalyze}
              disabled={analyzing}
              className="bg-gradient-to-r from-cyan-500 to-purple-600"
            >
              <Brain className="h-4 w-4 mr-2" />
              {analyzing ? 'Analyzing...' : 'Generate Analysis'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {analysis ? (
            <div className="space-y-4">
              <div>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Primary Causes
                </h4>
                <ul className="space-y-1">
                  {analysis.causes?.map((cause, idx) => (
                    <li key={idx} className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      • {cause}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  Confirmation Signals
                </h4>
                <ul className="space-y-1">
                  {analysis.confirmation?.map((signal, idx) => (
                    <li key={idx} className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      ✓ {signal}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                  Invalidation Signals
                </h4>
                <ul className="space-y-1">
                  {analysis.invalidation?.map((signal, idx) => (
                    <li key={idx} className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      ✗ {signal}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className={`font-semibold mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  Key Levels to Watch
                </h4>
                <div className="flex gap-2 flex-wrap">
                  {analysis.key_levels?.map((level, idx) => (
                    <Badge key={idx} variant="outline">{level}</Badge>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
              Click "Generate Analysis" to get AI-powered market causality insights
            </p>
          )}
        </CardContent>
      </Card>

      {/* AI Copilot Chat */}
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
        <CardHeader>
          <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-600'}>
            Market Cause Copilot
          </CardTitle>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Ask about market drivers, catalysts, and positioning
          </p>
        </CardHeader>
        <CardContent>
          <div className={`rounded-lg border ${
            darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
          } mb-4 h-64 overflow-y-auto p-4`}>
            {chatMessages.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Ask questions like:<br/>
                "Why is ES moving?"<br/>
                "What's the catalyst risk?"<br/>
                "Should I trade right now?"
              </div>
            ) : (
              <div className="space-y-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block max-w-[80%] p-3 rounded-lg ${
                      msg.role === 'user' 
                        ? 'bg-cyan-500 text-white' 
                        : darkMode ? 'bg-slate-800 text-slate-100' : 'bg-white border border-slate-200 text-slate-900'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="text-sm">{msg.content}</p>
                      ) : (
                        <ReactMarkdown className="text-sm prose prose-sm max-w-none dark:prose-invert">
                          {msg.content}
                        </ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Ask about market conditions..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
              className={darkMode ? 'bg-slate-900 border-slate-700' : ''}
            />
            <Button 
              onClick={handleChatSubmit}
              className="bg-gradient-to-r from-cyan-500 to-purple-600"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricRow({ label, value }) {
  const darkMode = document.documentElement.classList.contains('dark');
  
  return (
    <div className="flex justify-between items-center">
      <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>{label}</span>
      <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

function getScoreColor(score) {
  if (score >= 75) return 'text-red-500';
  if (score >= 60) return 'text-orange-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-green-500';
}