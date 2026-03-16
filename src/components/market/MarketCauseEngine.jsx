import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { TrendingUp, TrendingDown, AlertTriangle, Zap, Brain, RefreshCw, Send, Loader2, FileText, Users, Newspaper, ExternalLink, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function MarketCauseEngine() {
  const [scores, setScores] = useState(null);
  const [marketData, setMarketData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('ES');
  const [symbolSearch, setSymbolSearch] = useState('');
  const [secTicker, setSecTicker] = useState('');
  const [secQuestion, setSecQuestion] = useState('');
  const [secLoading, setSecLoading] = useState(false);
  const [secResult, setSecResult] = useState(null);
  const [activeTab, setActiveTab] = useState('intel');
  const chatEndRef = useRef(null);
  const darkMode = document.documentElement.classList.contains('dark');

  const popularSymbols = ['ES', 'NQ', 'YM', 'RTY', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'ETHUSD', 'GC', 'CL', 'AAPL', 'TSLA', 'NVDA'];

  useEffect(() => { loadMarketIntel(selectedSymbol); }, [selectedSymbol]);
  useEffect(() => {
    const interval = setInterval(() => loadMarketIntel(selectedSymbol), 60000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const loadMarketIntel = async (symbol) => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('marketCauseEngine', { action: 'scores', symbol });
      setScores(response.data.scores);
      setMarketData(response.data.marketData);
    } catch (error) {
      console.error('Failed to load market intel:', error);
    }
    setLoading(false);
  };

  const handleSymbolSearch = () => {
    if (symbolSearch.trim()) {
      setSelectedSymbol(symbolSearch.toUpperCase());
      setSymbolSearch('');
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await base44.functions.invoke('marketCauseEngine', { action: 'analyze', symbol: selectedSymbol });
      setAnalysis(response.data.analysis);
    } catch (error) {
      console.error('Analysis failed:', error);
    }
    setAnalyzing(false);
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const prompt = `You are a professional market intelligence assistant. Context for ${selectedSymbol}:
Regime: ${scores?.regime} | Composite: ${scores?.composite?.toFixed(0)}/100
Macro: 10Y=${marketData?.macro?.yield_10y}% | 2Y=${marketData?.macro?.yield_2y}% | VIX=${marketData?.macro?.vix} | DXY=${marketData?.macro?.dxy}
Positioning: Net $${marketData?.positioning?.net_position}B | Gamma: ${marketData?.positioning?.dealer_gamma} | P/C: ${marketData?.positioning?.put_call_ratio}
${marketData?.insiderData ? `Insider sentiment: ${marketData.insiderData.net_sentiment}` : ''}
${marketData?.newsData ? `News sentiment: ${marketData.newsData.sentiment}` : ''}
Data sources: FRED (real-time), Finnhub (calendar + news)

Question: "${userMessage}"
Provide a concise, data-backed, actionable response.`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({ prompt, add_context_from_internet: true });
      setChatMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error fetching response. Please try again.' }]);
    }
    setChatLoading(false);
  };

  const handleSECAnalyze = async () => {
    if (!secTicker.trim()) return;
    setSecLoading(true);
    setSecResult(null);
    try {
      const response = await base44.functions.invoke('secFilingsAnalyzer', {
        ticker: secTicker.toUpperCase(),
        question: secQuestion || undefined
      });
      setSecResult(response.data);
    } catch (error) {
      setSecResult({ error: error.message });
    }
    setSecLoading(false);
  };

  const regimeColor = {
    'RISK-OFF': 'bg-red-500', 'CAUTION': 'bg-orange-500',
    'NEUTRAL': 'bg-gray-500', 'RISK-ON': 'bg-green-500'
  }[scores?.regime] || 'bg-gray-500';

  const tabs = [
    { id: 'intel', label: 'Market Intel' },
    { id: 'analysis', label: 'AI Analysis' },
    { id: 'sec', label: 'SEC Filings' },
    { id: 'copilot', label: 'Copilot' }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className={`text-xl md:text-2xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Market Cause Engine — {selectedSymbol}
              </h2>
              <div className="flex items-center gap-2">
                <Database className="h-3 w-3 text-cyan-500" />
                <p className={`text-xs ${darkMode ? 'text-cyan-400/70' : 'text-slate-500'}`}>
                  Live: FRED API · Finnhub · SEC EDGAR · AI Synthesis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1">
                <Input
                  placeholder="Symbol..."
                  value={symbolSearch}
                  onChange={(e) => setSymbolSearch(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === 'Enter' && handleSymbolSearch()}
                  className={`w-28 h-8 text-sm ${darkMode ? 'bg-slate-900 border-slate-700' : ''}`}
                />
                <Button onClick={handleSymbolSearch} size="sm" variant="outline" className="h-8">Go</Button>
              </div>
              <Button onClick={() => loadMarketIntel(selectedSymbol)} variant="outline" size="sm" className="h-8" disabled={loading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {scores?.regime && (
                <Badge className={`${regimeColor} text-white`}>{scores.regime}</Badge>
              )}
            </div>
          </div>

          {/* Symbol Quick Select */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {popularSymbols.map(symbol => (
              <button key={symbol} onClick={() => setSelectedSymbol(symbol)}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  selectedSymbol === symbol
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                    : darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}>
                {symbol}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
          <span className={`ml-3 ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>Fetching live data from FRED & Finnhub...</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'MACRO PRESSURE', key: 'macro', sub: 'FRED Real-Time' },
              { label: 'POSITIONING', key: 'positioning', sub: 'COT / Options' },
              { label: 'CATALYST RISK', key: 'catalyst', sub: 'Finnhub Calendar' },
              { label: 'COMPOSITE', key: 'composite', sub: 'Combined Score' },
            ].map(({ label, key, sub }) => (
              <Card key={key} className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
                <CardContent className="p-4 text-center">
                  <div className={`text-xs mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</div>
                  <div className={`text-4xl font-bold ${getScoreColor(scores?.[key])}`}>
                    {scores?.[key]?.toFixed(0) ?? '—'}
                  </div>
                  <div className={`text-xs mt-1 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{sub}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 flex-wrap">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                    : darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Market Intel */}
          {activeTab === 'intel' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Macro Indicators */}
              <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    <TrendingUp className="h-4 w-4" />
                    Macro Indicators
                    <Badge variant="outline" className="text-xs ml-auto">FRED Live</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <MetricRow label="10Y Yield" value={`${marketData?.macro?.yield_10y ?? '—'}%`}
                    alert={marketData?.macro?.yield_10y > 4.5} alertText="High" />
                  <MetricRow label="2Y Yield" value={`${marketData?.macro?.yield_2y ?? '—'}%`} />
                  <MetricRow label="Yield Spread" value={`${((marketData?.macro?.yield_10y || 0) - (marketData?.macro?.yield_2y || 0)).toFixed(2)}%`}
                    alert={(marketData?.macro?.yield_10y - marketData?.macro?.yield_2y) < 0} alertText="Inverted" />
                  <MetricRow label="VIX" value={marketData?.macro?.vix ?? '—'}
                    alert={marketData?.macro?.vix > 20} alertText="Elevated" />
                  <MetricRow label="DXY (Dollar)" value={marketData?.macro?.dxy ?? '—'} />
                  <MetricRow label="Fed Balance Sheet" value={`$${marketData?.macro?.fed_balance_sheet ?? '—'}T`} />
                </CardContent>
              </Card>

              {/* Positioning */}
              <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    <Users className="h-4 w-4" />
                    {selectedSymbol} Positioning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <MetricRow label="Net Position" value={`$${marketData?.positioning?.net_position}B`} />
                  <MetricRow label="Dealer Gamma" value={marketData?.positioning?.dealer_gamma}
                    alert={marketData?.positioning?.dealer_gamma === 'negative'} alertText="Vol Amp" />
                  <MetricRow label="Put/Call Ratio" value={marketData?.positioning?.put_call_ratio}
                    alert={marketData?.positioning?.put_call_ratio > 1.2} alertText="Defensive" />
                  <MetricRow label="COT Net Long" value={marketData?.positioning?.cot_net_long?.toLocaleString()} />

                  {/* Insider Activity */}
                  {marketData?.insiderData && (
                    <div className={`mt-3 pt-3 border-t ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                      <div className={`text-xs font-semibold mb-2 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                        Insider Activity (Finnhub)
                      </div>
                      <MetricRow label="Recent Buys" value={marketData.insiderData.recent_buys} />
                      <MetricRow label="Recent Sells" value={marketData.insiderData.recent_sells} />
                      <div className="flex justify-between items-center mt-1">
                        <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Insider Signal</span>
                        <Badge className={
                          marketData.insiderData.net_sentiment === 'BULLISH' ? 'bg-green-500' :
                          marketData.insiderData.net_sentiment === 'BEARISH' ? 'bg-red-500' : 'bg-gray-500'
                        }>{marketData.insiderData.net_sentiment}</Badge>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* News Sentiment */}
              {marketData?.newsData && (
                <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
                  <CardHeader className="pb-2">
                    <CardTitle className={`text-sm flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                      <Newspaper className="h-4 w-4" />
                      News Sentiment (Finnhub)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Overall Sentiment</span>
                      <Badge className={
                        marketData.newsData.sentiment === 'POSITIVE' ? 'bg-green-500' :
                        marketData.newsData.sentiment === 'NEGATIVE' ? 'bg-red-500' : 'bg-gray-500'
                      }>{marketData.newsData.sentiment}</Badge>
                    </div>
                    <MetricRow label="Bullish Signals" value={marketData.newsData.bullish_signals} />
                    <MetricRow label="Bearish Signals" value={marketData.newsData.bearish_signals} />
                    <MetricRow label="Articles (3d)" value={marketData.newsData.article_count} />
                    {marketData.newsData.latest_headline && (
                      <div className={`mt-2 p-2 rounded text-xs ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-50 text-slate-600'}`}>
                        <span className="font-semibold">Latest: </span>{marketData.newsData.latest_headline}
                        {marketData.newsData.latest_url && (
                          <a href={marketData.newsData.latest_url} target="_blank" rel="noopener noreferrer"
                            className="ml-1 text-cyan-500 inline-flex items-center gap-0.5">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Catalysts */}
              <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
                <CardHeader className="pb-2">
                  <CardTitle className={`text-sm flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                    <AlertTriangle className="h-4 w-4" />
                    Upcoming Catalysts
                    <Badge variant="outline" className="text-xs ml-auto">Finnhub Live</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {marketData?.catalysts?.map((catalyst, idx) => (
                      <div key={idx} className={`flex justify-between items-center p-2 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 flex-shrink-0 ${
                            catalyst.impact === 'EXTREME' ? 'text-red-500' :
                            catalyst.impact === 'HIGH' ? 'text-orange-500' : 'text-yellow-500'
                          }`} />
                          <div>
                            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                              {catalyst.name}
                            </span>
                            {catalyst.country && (
                              <span className={`ml-1 text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                                {catalyst.country.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="outline" className="text-xs">{catalyst.time}</Badge>
                          <Badge className={`text-xs ${
                            catalyst.impact === 'EXTREME' ? 'bg-red-500' :
                            catalyst.impact === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'
                          }`}>{catalyst.impact}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tab: AI Analysis */}
          {activeTab === 'analysis' && (
            <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-600'}>
                    AI Causality Analysis — {selectedSymbol}
                  </CardTitle>
                  <Button onClick={handleAnalyze} disabled={analyzing}
                    className="bg-gradient-to-r from-cyan-500 to-purple-600">
                    <Brain className="h-4 w-4 mr-2" />
                    {analyzing ? 'Analyzing...' : 'Generate Analysis'}
                  </Button>
                </div>
                <p className={`text-xs mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Uses real FRED + Finnhub data fed into AI for grounded causality analysis
                </p>
              </CardHeader>
              <CardContent>
                {analyzing ? (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                      Synthesizing real market data with AI...
                    </span>
                  </div>
                ) : analysis ? (
                  <div className="space-y-5">
                    {analysis.regime_summary && (
                      <div className={`p-3 rounded-lg border ${darkMode ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'}`}>
                        <p className={`text-sm font-medium ${darkMode ? 'text-cyan-300' : 'text-cyan-800'}`}>
                          {analysis.regime_summary}
                        </p>
                      </div>
                    )}
                    <AnalysisSection title="Primary Causes" items={analysis.causes} color="green" prefix="•" darkMode={darkMode} />
                    <AnalysisSection title="Confirmation Signals" items={analysis.confirmation} color="cyan" prefix="✓" darkMode={darkMode} />
                    <AnalysisSection title="Invalidation Signals" items={analysis.invalidation} color="red" prefix="✗" darkMode={darkMode} />
                    {analysis.key_levels && (
                      <div>
                        <h4 className={`font-semibold mb-2 text-sm ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                          Key Levels to Watch
                        </h4>
                        <div className="flex gap-2 flex-wrap">
                          {analysis.key_levels.map((level, idx) => (
                            <Badge key={idx} variant="outline" className="font-mono">{level}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`text-center py-12 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Click "Generate Analysis" to get AI causality insights</p>
                    <p className="text-xs mt-1">Powered by real FRED + Finnhub data</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab: SEC Filings */}
          {activeTab === 'sec' && (
            <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
              <CardHeader>
                <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  <FileText className="h-5 w-5" />
                  SEC EDGAR Filing Analyzer
                </CardTitle>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  AI-powered analysis of 10-K, 10-Q, and 8-K filings from SEC EDGAR
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <Input
                    placeholder="Ticker (e.g. AAPL, TSLA, NVDA)"
                    value={secTicker}
                    onChange={(e) => setSecTicker(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleSECAnalyze()}
                    className={darkMode ? 'bg-slate-900 border-slate-700' : ''}
                  />
                  <Input
                    placeholder="Question (optional) — e.g. What are the key risk factors?"
                    value={secQuestion}
                    onChange={(e) => setSecQuestion(e.target.value)}
                    className={`flex-[2] ${darkMode ? 'bg-slate-900 border-slate-700' : ''}`}
                  />
                  <Button onClick={handleSECAnalyze} disabled={secLoading || !secTicker}
                    className="bg-gradient-to-r from-cyan-500 to-purple-600">
                    {secLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    <span className="ml-2">{secLoading ? 'Analyzing...' : 'Analyze'}</span>
                  </Button>
                </div>

                {secLoading && (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                    <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>
                      Fetching from SEC EDGAR and analyzing with AI...
                    </span>
                  </div>
                )}

                {secResult && !secResult.error && (
                  <div className="space-y-4">
                    {/* Filing Metadata */}
                    <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                            {secResult.company}
                          </span>
                          <span className={`ml-2 text-sm ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                            ({secResult.ticker})
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">CIK: {secResult.cik}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {secResult.filings?.map((f, idx) => (
                          <a key={idx} href={f.url} target="_blank" rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border transition ${
                              darkMode ? 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10' : 'border-cyan-300 text-cyan-700 hover:bg-cyan-50'
                            }`}>
                            <FileText className="h-3 w-3" />
                            {f.form} — {f.date}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ))}
                      </div>
                    </div>

                    {/* AI Analysis */}
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-white border border-slate-200'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Brain className="h-4 w-4 text-purple-500" />
                        <span className={`text-sm font-semibold ${darkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                          AI Filing Analysis
                        </span>
                        <Badge className="bg-purple-600 text-white text-xs ml-auto">Claude Sonnet</Badge>
                      </div>
                      <div className={`text-sm leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
                          {secResult.analysis}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}

                {secResult?.error && (
                  <div className={`p-3 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
                    <p className="text-sm text-red-500">{secResult.error}</p>
                  </div>
                )}

                {!secResult && !secLoading && (
                  <div className={`text-center py-10 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Enter a stock ticker to analyze SEC filings</p>
                    <p className="text-xs mt-1">Supports any publicly traded US company</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tab: Copilot */}
          {activeTab === 'copilot' && (
            <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white'}>
              <CardHeader>
                <CardTitle className={darkMode ? 'text-cyan-400' : 'text-cyan-600'}>
                  Market Cause Copilot
                </CardTitle>
                <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Chat with real FRED + Finnhub data in context for {selectedSymbol}
                </p>
              </CardHeader>
              <CardContent>
                <div className={`rounded-lg border mb-4 h-72 overflow-y-auto p-4 space-y-4 ${
                  darkMode ? 'border-slate-700 bg-slate-900/50' : 'border-slate-200 bg-slate-50'
                }`}>
                  {chatMessages.length === 0 ? (
                    <div className={`text-center py-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                      <p className="text-sm mb-2">Ask questions like:</p>
                      {["Why is ES moving?", "What's the catalyst risk this week?", "Is now a good time to trade NQ?"].map(q => (
                        <button key={q} onClick={() => setChatInput(q)}
                          className={`block mx-auto my-1 text-xs px-3 py-1 rounded-full border transition ${
                            darkMode ? 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10' : 'border-cyan-300 text-cyan-700 hover:bg-cyan-50'
                          }`}>
                          "{q}"
                        </button>
                      ))}
                    </div>
                  ) : (
                    chatMessages.map((msg, idx) => (
                      <div key={idx} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                        <div className={`inline-block max-w-[85%] p-3 rounded-xl text-sm ${
                          msg.role === 'user'
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                            : darkMode ? 'bg-slate-800 text-slate-100' : 'bg-white border border-slate-200 text-slate-900'
                        }`}>
                          {msg.role === 'user' ? (
                            <p>{msg.content}</p>
                          ) : (
                            <ReactMarkdown className="prose prose-sm max-w-none dark:prose-invert">
                              {msg.content}
                            </ReactMarkdown>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {chatLoading && (
                    <div className="text-left">
                      <div className={`inline-block p-3 rounded-xl ${darkMode ? 'bg-slate-800' : 'bg-white border border-slate-200'}`}>
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about market conditions..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                    className={darkMode ? 'bg-slate-900 border-slate-700' : ''}
                  />
                  <Button onClick={handleChatSubmit} disabled={chatLoading}
                    className="bg-gradient-to-r from-cyan-500 to-purple-600">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MetricRow({ label, value, alert, alertText }) {
  const darkMode = document.documentElement.classList.contains('dark');
  return (
    <div className="flex justify-between items-center">
      <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{label}</span>
      <div className="flex items-center gap-2">
        {alert && alertText && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-500">{alertText}</span>
        )}
        <span className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{value ?? '—'}</span>
      </div>
    </div>
  );
}

function AnalysisSection({ title, items, color, prefix, darkMode }) {
  const colorMap = {
    green: darkMode ? 'text-green-400' : 'text-green-600',
    cyan: darkMode ? 'text-cyan-400' : 'text-cyan-600',
    red: darkMode ? 'text-red-400' : 'text-red-600',
  };
  return (
    <div>
      <h4 className={`font-semibold mb-2 text-sm ${colorMap[color]}`}>{title}</h4>
      <ul className="space-y-1">
        {items?.map((item, idx) => (
          <li key={idx} className={`text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            {prefix} {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function getScoreColor(score) {
  if (score >= 75) return 'text-red-500';
  if (score >= 60) return 'text-orange-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-green-500';
}