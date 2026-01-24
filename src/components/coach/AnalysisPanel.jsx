import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, TrendingUp, Heart, Shield, Calendar, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReactMarkdown from 'react-markdown';

export default function AnalysisPanel() {
  const [analysisType, setAnalysisType] = useState('weekly_summary');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [contextData, setContextData] = useState(null);

  const analysisTypes = [
    { value: 'weekly_summary', label: 'Weekly Summary', icon: Calendar, color: 'from-cyan-500 to-blue-600' },
    { value: 'performance_by_strategy', label: 'Strategy Performance', icon: TrendingUp, color: 'from-purple-500 to-pink-600' },
    { value: 'emotion_correlation', label: 'Emotion Analysis', icon: Heart, color: 'from-rose-500 to-orange-600' },
    { value: 'risk_management', label: 'Risk Assessment', icon: Shield, color: 'from-green-500 to-emerald-600' }
  ];

  const currentType = analysisTypes.find(t => t.value === analysisType);
  const Icon = currentType?.icon || Brain;

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const result = await base44.functions.invoke('aiAnalyzeTrades', {
        analysisType,
        dateRange: analysisType === 'weekly_summary' ? null : {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString()
        }
      });

      setAnalysis(result.data.analysis);
      setContextData(result.data.contextData);
    } catch (error) {
      setAnalysis(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-slate-950/90 to-purple-950/90 border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <div className={`p-3 rounded-lg bg-gradient-to-r ${currentType?.color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            Deep Performance Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={analysisType} onValueChange={setAnalysisType}>
              <SelectTrigger className="flex-1 bg-slate-900 border-cyan-500/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {analysisTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleAnalyze}
              disabled={loading}
              className={`bg-gradient-to-r ${currentType?.color} text-white`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>

          {contextData && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {contextData.totalTrades !== undefined && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Total Trades</p>
                  <p className="text-2xl font-bold text-cyan-400">{contextData.totalTrades}</p>
                </div>
              )}
              {contextData.wins !== undefined && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Win Rate</p>
                  <p className="text-2xl font-bold text-green-400">{contextData.winRate}%</p>
                </div>
              )}
              {contextData.avgRiskReward !== undefined && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Avg R:R</p>
                  <p className="text-2xl font-bold text-purple-400">{contextData.avgRiskReward.toFixed(2)}</p>
                </div>
              )}
              {contextData.maxDrawdown !== undefined && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">Max Drawdown</p>
                  <p className="text-2xl font-bold text-red-400">{contextData.maxDrawdown.toFixed(1)}%</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <Card className="bg-slate-950/90 border-cyan-500/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">AI Analysis Results</CardTitle>
              <Badge className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white">
                Powered by AI
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-invert prose-cyan max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className="text-2xl font-bold text-cyan-400 mb-4">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-xl font-semibold text-purple-400 mb-3 mt-6">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-lg font-medium text-white mb-2 mt-4">{children}</h3>,
                  p: ({ children }) => <p className="text-slate-300 mb-3 leading-relaxed">{children}</p>,
                  ul: ({ children }) => <ul className="space-y-2 mb-4 ml-4">{children}</ul>,
                  ol: ({ children }) => <ol className="space-y-2 mb-4 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="text-slate-300">{children}</li>,
                  strong: ({ children }) => <strong className="text-cyan-400 font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="text-purple-400">{children}</em>,
                }}
              >
                {analysis}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}