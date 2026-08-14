import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { Brain, Zap, RefreshCw, Loader2, History, AlertTriangle, TrendingUp, TrendingDown, Minus, ChevronRight, BookOpen } from 'lucide-react';
import QQEBriefingView from '@/components/qqe/QQEBriefingView';
import { CURATED_SYMBOLS } from '@/lib/symbolRegistry';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function QQEngine() {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedSymbol, setSelectedSymbol] = useState('MNQ');
  const [showHistory, setShowHistory] = useState(false);
  const [useBible, setUseBible] = useState(true);
  const [stale, setStale] = useState(false);
  const darkMode = document.documentElement.classList.contains('dark');

  const symbols = Object.keys(CURATED_SYMBOLS);

  const { data: defaultBible } = useQuery({
    queryKey: ['defaultBible'],
    queryFn: async () => {
      const bibles = await base44.entities.TradingBible.list('-created_date', 50);
      return bibles.find(b => b.is_default) || bibles[0] || null;
    }
  });

  const today = new Date().toLocaleDateString('en-CA');

  useEffect(() => {
    loadLatestBriefing();
    loadHistory();
  }, [selectedSymbol]);

  const loadLatestBriefing = async () => {
    try {
      const records = await base44.entities.QQEBriefing.filter(
        { symbol: selectedSymbol },
        '-created_date',
        1
      );
      const latest = records?.[0];
      if (latest) {
        setBriefing({
          id: latest.id,
          date: latest.date,
          symbol: latest.symbol,
          sessionScore: latest.session_score,
          session_grade: latest.session_grade,
          directional_bias: latest.directional_bias,
          conviction: latest.conviction,
          template: { template: latest.regime_template, confidence: latest.template_confidence },
          macro: { vix: latest.vix_level, dxy: latest.dxy_level, yield_10y: latest.yield_10y },
          cause_analysis: latest.cause_analysis,
          trade_plan: latest.trade_plan,
          avoid_list: latest.avoid_list,
          invalidation: latest.invalidation,
          markdown: latest.briefing_markdown
        });
        setStale(latest.date !== today);
      } else {
        setBriefing(null);
        setStale(false);
      }
    } catch (error) {
      console.error('Failed to load latest briefing:', error);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const records = await base44.entities.QQEBriefing.list('-created_date', 20);
      setHistory(records || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
    setLoadingHistory(false);
  };

  const generateBriefing = async () => {
    setLoading(true);
    setBriefing(null);
    try {
      const response = await base44.functions.invoke('qqeEngine', {
        action: 'briefing',
        symbol: selectedSymbol,
        use_bible: useBible && !!defaultBible,
        bible_id: useBible ? defaultBible?.id : null
      });
      if (response.data?.success) {
        setBriefing(response.data.briefing);
        setStale(false);
        loadHistory();
        toast.success('QQE Daily Briefing generated');
      } else {
        toast.error(response.data?.error || 'Failed to generate briefing');
      }
    } catch (error) {
      console.error('QQE Engine error:', error);
      toast.error('Failed to generate briefing: ' + error.message);
    }
    setLoading(false);
  };

  const biasIcon = {
    'LONG': TrendingUp, 'SHORT': TrendingDown, 'NEUTRAL': Minus
  };

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900'
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
              <Brain className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className={`text-2xl md:text-4xl font-bold bg-gradient-to-r ${
                darkMode ? 'from-purple-400 to-cyan-400' : 'from-purple-600 to-cyan-600'
              } bg-clip-text text-transparent`}>
                QQE Engine
              </h1>
              <p className={`text-sm md:text-base ${darkMode ? 'text-purple-400/70' : 'text-purple-700/70'}`}>
                Quantitative-Qualitative Engine — Where data meets the "why"
              </p>
            </div>
          </div>
        </div>

        {/* Control Bar */}
        <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-medium ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>Instrument:</span>
                {symbols.map(sym => (
                  <button
                    key={sym}
                    onClick={() => setSelectedSymbol(sym)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedSymbol === sym
                        ? 'bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg'
                        : darkMode
                          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {sym}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {defaultBible && (
                  <button
                    onClick={() => setUseBible(!useBible)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      useBible
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                        : darkMode
                          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={defaultBible.name}
                  >
                    <BookOpen className="h-3 w-3" />
                    {useBible ? 'Bible: ON' : 'Bible: OFF'}
                  </button>
                )}
                 <Button
                   onClick={() => setShowHistory(!showHistory)}
                  variant="outline"
                  size="sm"
                  className={darkMode ? 'border-cyan-500/30 text-cyan-400' : 'border-cyan-500/30 text-cyan-700'}
                >
                  <History className="h-4 w-4 mr-1" />
                  History ({history.length})
                </Button>
                <Button
                  onClick={generateBriefing}
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-500 to-cyan-500"
                >
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                  {loading ? 'Generating...' : 'Generate Briefing'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stale Briefing Banner */}
        {!loading && briefing && stale && (
          <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${darkMode ? 'text-amber-300' : 'text-amber-900'}`}>
                  This briefing is from {briefing.date} — not today ({today}).
                </p>
                <p className={`text-xs ${darkMode ? 'text-amber-400/80' : 'text-amber-700'}`}>
                  Click “Generate Briefing” to pull current market data for today.
                </p>
              </div>
              <Button
                onClick={generateBriefing}
                disabled={loading}
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Generate Today's
              </Button>
            </CardContent>
          </Card>
        )}

        {/* History Panel */}
        {showHistory && (
          <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
            <CardHeader>
              <CardTitle className={`text-sm flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                <History className="h-4 w-4" />
                Historical Briefings — Pattern "Rhymes"
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
                </div>
              ) : history.length === 0 ? (
                <p className={`text-center py-6 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  No briefings yet. Generate your first one to start building your pattern database.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.map((h) => {
                    const BiasIcon = biasIcon[h.directional_bias] || Minus;
                    return (
                      <div
                        key={h.id}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition ${
                          darkMode ? 'bg-slate-900/50 hover:bg-slate-800' : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                        onClick={() => {
                          setBriefing({
                            id: h.id,
                            date: h.date,
                            symbol: h.symbol,
                            sessionScore: h.session_score,
                            session_grade: h.session_grade,
                            directional_bias: h.directional_bias,
                            conviction: h.conviction,
                            template: { template: h.regime_template, confidence: h.template_confidence },
                            macro: { vix: h.vix_level, dxy: h.dxy_level, yield_10y: h.yield_10y },
                            cause_analysis: h.cause_analysis,
                            trade_plan: h.trade_plan,
                            avoid_list: h.avoid_list,
                            invalidation: h.invalidation,
                            markdown: h.briefing_markdown
                          });
                          setStale(h.date !== today);
                          setShowHistory(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <div className={`text-xs font-mono ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {h.date}
                        </div>
                        <Badge className={`text-xs ${h.session_grade === 'A' ? 'bg-green-500' : h.session_grade === 'B' ? 'bg-cyan-500' : h.session_grade === 'C' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                          {h.session_grade} ({h.session_score}/14)
                        </Badge>
                        <Badge variant="outline" className="text-xs">{h.symbol}</Badge>
                        <Badge className={`text-xs ${
                          h.directional_bias === 'LONG' ? 'bg-green-500' :
                          h.directional_bias === 'SHORT' ? 'bg-red-500' : 'bg-yellow-500'
                        }`}>
                          <BiasIcon className="h-3 w-3 mr-1" />
                          {h.directional_bias}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{h.regime_template}</Badge>
                        <span className={`text-xs ml-auto ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          VIX: {h.vix_level?.toFixed(1)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Brain className="h-16 w-16 text-purple-500 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                  </div>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    QQE Engine Analyzing...
                  </p>
                  <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Fetching FRED macro data · Yahoo Finance prices · Finnhub calendar · AI synthesis
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-center">
                  {['Macro Data', 'Price Action', '14-Factor Score', 'Regime Template', 'Cause Analysis', 'Trade Plan'].map((step, idx) => (
                    <Badge key={step} variant="outline" className={`text-xs animate-pulse ${darkMode ? 'border-cyan-500/30 text-cyan-400' : 'border-cyan-300 text-cyan-600'}`}
                      style={{ animationDelay: `${idx * 0.2}s` }}>
                      {step}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Briefing Display */}
        {!loading && briefing && <QQEBriefingView briefing={briefing} darkMode={darkMode} />}

        {/* Empty State */}
        {!loading && !briefing && (
          <Card className={`${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
            <CardContent className="p-8 md:p-12 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Brain className="h-10 w-10 text-white" />
              </div>
              <h2 className={`text-xl md:text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                QQE Daily Briefing
              </h2>
              <p className={`text-sm md:text-base max-w-md mx-auto mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Generate a complete Quantitative-Qualitative analysis combining real-time macro data,
                price action, 14-factor session scoring, regime template identification, and AI-powered
                cause-and-effect reasoning.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto mb-6">
                {[
                  { label: 'Macro Data', desc: 'FRED API Live', icon: TrendingUp },
                  { label: 'Price Action', desc: 'Yahoo Finance', icon: Zap },
                  { label: '14-Factor Score', desc: 'Session Grade', icon: AlertTriangle },
                  { label: 'Pattern Rhymes', desc: 'Historical Match', icon: History },
                ].map(({ label, desc, icon: Icon }) => (
                  <div key={label} className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
                    <Icon className="h-5 w-5 mx-auto mb-1 text-cyan-500" />
                    <div className={`text-xs font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>{label}</div>
                    <div className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{desc}</div>
                  </div>
                ))}
              </div>
              <Button
                onClick={generateBriefing}
                size="lg"
                className="bg-gradient-to-r from-purple-500 to-cyan-500"
              >
                <Zap className="h-5 w-5 mr-2" />
                Generate My First Briefing
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}