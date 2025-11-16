import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Lightbulb, Brain } from 'lucide-react';

export default function AIInsightsPanel({ insights, patterns, risks, emotionalAnalysis }) {
  if (!insights) return null;

  return (
    <div className="space-y-6">
      {/* Main Insights */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <CardTitle>AI Performance Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strengths */}
          {insights.strengths?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <h3 className="font-bold text-green-900">Strengths</h3>
              </div>
              <ul className="space-y-2">
                {insights.strengths.map((item, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {insights.weaknesses?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-red-600" />
                <h3 className="font-bold text-red-900">Areas for Improvement</h3>
              </div>
              <ul className="space-y-2">
                {insights.weaknesses.map((item, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-red-600 mt-0.5">⚠</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {insights.recommendations?.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-yellow-600" />
                <h3 className="font-bold text-slate-900">Recommendations</h3>
              </div>
              <ul className="space-y-2">
                {insights.recommendations.map((item, idx) => (
                  <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">💡</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profitable Patterns */}
      {patterns?.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <CardTitle>Profitable Patterns Identified</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patterns.map((pattern, idx) => (
                <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-900">{pattern.name}</h4>
                    <Badge className="bg-green-100 text-green-800">
                      {pattern.winRate?.toFixed(1)}% Win Rate
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{pattern.description}</p>
                  <div className="bg-blue-50 rounded p-2 text-sm text-blue-900">
                    <strong>Action:</strong> {pattern.advice}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Alerts */}
      {risks?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <CardTitle>Risk Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {risks.map((risk, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${
                    risk.level === 'High'
                      ? 'bg-red-50 border-red-300'
                      : risk.level === 'Medium'
                      ? 'bg-yellow-50 border-yellow-300'
                      : 'bg-blue-50 border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      className={
                        risk.level === 'High'
                          ? 'bg-red-200 text-red-900'
                          : risk.level === 'Medium'
                          ? 'bg-yellow-200 text-yellow-900'
                          : 'bg-blue-200 text-blue-900'
                      }
                    >
                      {risk.level} Risk
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-slate-900 mb-1">{risk.description}</p>
                  <p className="text-sm text-slate-700">
                    <strong>Mitigation:</strong> {risk.mitigation}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emotional Analysis */}
      {emotionalAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle>Emotional Impact Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-slate-700">{emotionalAnalysis.analysis}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}