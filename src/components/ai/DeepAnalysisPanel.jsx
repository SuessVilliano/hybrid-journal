import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Calendar, Target, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function DeepAnalysisPanel() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [activeTab, setActiveTab] = useState('plan_effectiveness');
  const darkMode = document.documentElement.classList.contains('dark');

  const analysisTypes = [
    { id: 'plan_effectiveness', label: 'Plan Effectiveness', icon: Target },
    { id: 'sentiment_trends', label: 'Sentiment Trends', icon: TrendingUp },
    { id: 'mood_correlation', label: 'Mood Correlation', icon: Brain },
    { id: 'trading_patterns', label: 'Trading Patterns', icon: Zap }
  ];

  const runAnalysis = async (type) => {
    setLoading(true);
    setActiveTab(type);
    
    try {
      const result = await base44.functions.invoke('analyzeTradePatterns', {
        analysis_type: type,
        timeframe_days: 30
      });
      
      setAnalysis(result.data.analysis);
      toast.success('Analysis complete!');
    } catch (error) {
      toast.error('Analysis failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const runComprehensiveAnalysis = async () => {
    setLoading(true);
    setActiveTab('comprehensive');
    
    try {
      const result = await base44.functions.invoke('analyzeTradePatterns', {
        analysis_type: 'comprehensive',
        timeframe_days: 30
      });
      
      setAnalysis(result.data.analysis);
      toast.success('Comprehensive analysis complete!');
    } catch (error) {
      toast.error('Analysis failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            <Brain className="h-5 w-5" />
            AI Deep Analysis
          </CardTitle>
          <Button
            onClick={runComprehensiveAnalysis}
            disabled={loading}
            className="bg-gradient-to-r from-cyan-500 to-purple-600"
            size="sm"
          >
            {loading ? 'Analyzing...' : 'Run Full Analysis'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Analysis Type Selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {analysisTypes.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              onClick={() => runAnalysis(id)}
              disabled={loading}
              variant={activeTab === id ? 'default' : 'outline'}
              className={`flex items-center gap-2 ${
                activeTab === id && 'bg-gradient-to-r from-cyan-500 to-purple-600'
              }`}
              size="sm"
            >
              <Icon className="h-4 w-4" />
              <span className="hidden md:inline">{label}</span>
            </Button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto mb-4"></div>
              <p className={darkMode ? 'text-slate-400' : 'text-slate-600'}>
                Analyzing your trading data...
              </p>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {!loading && analysis && (
          <div className="space-y-4">
            {activeTab === 'plan_effectiveness' && analysis.adherence_rate !== undefined && (
              <PlanEffectivenessView data={analysis} darkMode={darkMode} />
            )}
            {activeTab === 'sentiment_trends' && analysis.overall_trend && (
              <SentimentTrendsView data={analysis} darkMode={darkMode} />
            )}
            {activeTab === 'mood_correlation' && analysis.best_performing_moods && (
              <MoodCorrelationView data={analysis} darkMode={darkMode} />
            )}
            {activeTab === 'trading_patterns' && analysis.patterns_identified && (
              <TradingPatternsView data={analysis} darkMode={darkMode} />
            )}
            {activeTab === 'comprehensive' && (
              <ComprehensiveView data={analysis} darkMode={darkMode} />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlanEffectivenessView({ data, darkMode }) {
  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Plan Adherence
          </h3>
          <Badge className={data.adherence_rate >= 70 ? 'bg-green-600' : 'bg-orange-600'}>
            {data.adherence_rate}%
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Planned Avg P&L</div>
            <div className={`text-lg font-bold ${data.planned_vs_unplanned_performance?.planned_avg_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${data.planned_vs_unplanned_performance?.planned_avg_pnl?.toFixed(2)}
            </div>
          </div>
          <div>
            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Unplanned Avg P&L</div>
            <div className={`text-lg font-bold ${data.planned_vs_unplanned_performance?.unplanned_avg_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${data.planned_vs_unplanned_performance?.unplanned_avg_pnl?.toFixed(2)}
            </div>
          </div>
        </div>

        <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Overall Score</div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-cyan-500 to-purple-600 h-2 rounded-full"
            style={{ width: `${data.overall_score}%` }}
          ></div>
        </div>
      </div>

      {data.impulsive_trades?.length > 0 && (
        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h4 className={`font-bold ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
              Impulsive Trades Detected
            </h4>
          </div>
          <div className="space-y-2">
            {data.impulsive_trades.slice(0, 3).map((trade, idx) => (
              <div key={idx} className={`text-sm ${darkMode ? 'text-red-300' : 'text-red-700'}`}>
                {trade.date}: {trade.symbol} - {trade.likely_trigger}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <h4 className={`font-bold mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Recommendations</h4>
        <ul className={`space-y-1 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {data.recommendations?.map((rec, idx) => (
            <li key={idx}>• {rec}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SentimentTrendsView({ data, darkMode }) {
  const trendIcon = data.overall_trend === 'improving' ? TrendingUp : data.overall_trend === 'declining' ? TrendingDown : Brain;
  const TrendIcon = trendIcon;

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
            Overall Trend
          </h3>
          <Badge className={
            data.overall_trend === 'improving' ? 'bg-green-600' :
            data.overall_trend === 'declining' ? 'bg-red-600' : 'bg-slate-600'
          }>
            <TrendIcon className="h-3 w-3 mr-1" />
            {data.overall_trend}
          </Badge>
        </div>

        <div className="space-y-3">
          <h4 className={`font-bold text-sm ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Dominant Emotions</h4>
          {data.dominant_emotions?.slice(0, 5).map((emotion, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{emotion.emotion}</span>
              <Badge variant="outline">{emotion.frequency}x</Badge>
            </div>
          ))}
        </div>
      </div>

      {data.red_flags?.length > 0 && (
        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-orange-900/20 border-orange-500/30' : 'bg-orange-50 border-orange-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <h4 className={`font-bold ${darkMode ? 'text-orange-400' : 'text-orange-700'}`}>
              Red Flags
            </h4>
          </div>
          <div className="space-y-2">
            {data.red_flags.map((flag, idx) => (
              <div key={idx} className={`text-sm ${darkMode ? 'text-orange-300' : 'text-orange-700'}`}>
                <Badge className="bg-orange-600 mb-1">{flag.severity}</Badge> {flag.flag}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MoodCorrelationView({ data, darkMode }) {
  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Best Performing Moods
        </h3>
        {data.best_performing_moods?.slice(0, 3).map((mood, idx) => (
          <div key={idx} className="flex items-center justify-between mb-2">
            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{mood.mood}</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-600">{mood.win_rate?.toFixed(0)}% WR</Badge>
              <span className="text-green-400 font-bold">${mood.avg_pnl?.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <h3 className={`font-bold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          Worst Performing Moods
        </h3>
        {data.worst_performing_moods?.slice(0, 3).map((mood, idx) => (
          <div key={idx} className="flex items-center justify-between mb-2">
            <span className={darkMode ? 'text-slate-300' : 'text-slate-700'}>{mood.mood}</span>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-600">{mood.win_rate?.toFixed(0)}% WR</Badge>
              <span className="text-red-400 font-bold">${mood.avg_pnl?.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
        <h4 className={`font-bold mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>Key Insights</h4>
        <ul className={`space-y-1 text-sm ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          {data.insights?.map((insight, idx) => (
            <li key={idx}>• {insight}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function TradingPatternsView({ data, darkMode }) {
  return (
    <div className="space-y-4">
      {data.patterns_identified?.map((pattern, idx) => (
        <div key={idx} className={`p-4 rounded-lg border ${
          pattern.severity === 'critical' ? (darkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200') :
          pattern.severity === 'high' ? (darkMode ? 'bg-orange-900/20 border-orange-500/30' : 'bg-orange-50 border-orange-200') :
          darkMode ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {pattern.pattern_name}
            </h4>
            <Badge className={
              pattern.severity === 'critical' ? 'bg-red-600' :
              pattern.severity === 'high' ? 'bg-orange-600' : 'bg-yellow-600'
            }>
              {pattern.severity}
            </Badge>
          </div>
          
          <p className={`text-sm mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            <strong>Impact:</strong> ${pattern.impact_on_pnl?.toFixed(2)} | <strong>Frequency:</strong> {pattern.frequency}x
          </p>
          
          <p className={`text-sm mb-2 ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <strong>Root Cause:</strong> {pattern.root_cause}
          </p>
          
          <div className={`text-sm p-2 rounded ${darkMode ? 'bg-cyan-900/20' : 'bg-cyan-50'}`}>
            <strong className={darkMode ? 'text-cyan-400' : 'text-cyan-700'}>Fix:</strong> {pattern.fix}
          </div>
        </div>
      ))}

      {data.positive_patterns?.length > 0 && (
        <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900/20 border border-green-500/30' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <h4 className={`font-bold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
              Positive Patterns
            </h4>
          </div>
          {data.positive_patterns.map((pattern, idx) => (
            <div key={idx} className={`text-sm ${darkMode ? 'text-green-300' : 'text-green-700'} mb-1`}>
              ✓ {pattern.pattern_name}: {pattern.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ComprehensiveView({ data, darkMode }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className={`font-bold mb-3 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          Plan Effectiveness
        </h3>
        <PlanEffectivenessView data={data.planEff} darkMode={darkMode} />
      </div>
      
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      
      <div>
        <h3 className={`font-bold mb-3 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          Sentiment Analysis
        </h3>
        <SentimentTrendsView data={data.sentiment} darkMode={darkMode} />
      </div>
      
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      
      <div>
        <h3 className={`font-bold mb-3 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          Mood Correlation
        </h3>
        <MoodCorrelationView data={data.mood} darkMode={darkMode} />
      </div>
      
      <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      
      <div>
        <h3 className={`font-bold mb-3 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          Trading Patterns
        </h3>
        <TradingPatternsView data={data.patterns} darkMode={darkMode} />
      </div>
    </div>
  );
}