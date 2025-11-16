import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, TrendingUp, RefreshCw, Target } from 'lucide-react';
import { analyzePortfolioRisk } from './RiskEngine';

export default function PortfolioRiskPanel({ trades, accountBalance = 10000 }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const result = await analyzePortfolioRisk(trades, accountBalance);
      setAnalysis(result);
    } catch (error) {
      console.error('Risk analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trades.length > 0) {
      runAnalysis();
    }
  }, [trades]);

  const getRiskColor = () => {
    if (!analysis) return 'bg-slate-100 text-slate-800';
    switch (analysis.riskLevel?.toLowerCase()) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <CardTitle>Portfolio Risk Analysis</CardTitle>
        </div>
        <Button size="sm" onClick={runAnalysis} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>

      <CardContent>
        {loading && !analysis ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            {/* Risk Level */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <div className="text-sm text-slate-600">Overall Risk Level</div>
                <Badge className={`mt-1 ${getRiskColor()}`}>
                  {analysis.riskLevel}
                </Badge>
              </div>
              {analysis.riskLevel?.toLowerCase() !== 'low' && (
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              )}
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-slate-600">Diversification</div>
                <div className="text-2xl font-bold text-blue-900">
                  {analysis.diversificationScore}/100
                </div>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <div className="text-xs text-slate-600">Open Positions</div>
                <div className="text-2xl font-bold text-purple-900">
                  {analysis.openPositions}
                </div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-xs text-slate-600">Max Position Size</div>
                <div className="text-2xl font-bold text-green-900">
                  {analysis.maxPositionSize?.toFixed(1)}%
                </div>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <div className="text-xs text-slate-600">Daily Risk Limit</div>
                <div className="text-2xl font-bold text-orange-900">
                  ${analysis.dailyRiskLimit?.toFixed(0)}
                </div>
              </div>
            </div>

            {/* Exposure */}
            <div className="p-3 border border-slate-200 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-slate-700">Total Exposure</span>
                <span className="text-lg font-bold text-slate-900">
                  ${analysis.totalExposure?.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    analysis.exposureRatio > 80 ? 'bg-red-500' :
                    analysis.exposureRatio > 50 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(analysis.exposureRatio, 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {analysis.exposureRatio?.toFixed(1)}% of account balance
              </div>
            </div>

            {/* Recommendations */}
            {analysis.recommendedActions?.length > 0 && (
              <div className="space-y-2">
                <div className="font-medium text-slate-900 flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Recommended Actions
                </div>
                <ul className="space-y-2">
                  {analysis.recommendedActions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-slate-500 text-center py-8">Run analysis to view risk metrics</p>
        )}
      </CardContent>
    </Card>
  );
}