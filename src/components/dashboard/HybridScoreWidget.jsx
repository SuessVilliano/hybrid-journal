import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, TrendingUp, ShieldCheck, Activity, Brain, Database } from 'lucide-react';
import { calculateHybridScore } from '@/lib/tradingAnalytics';

export default function HybridScoreWidget({ trades }) {
  const darkMode = document.documentElement.classList.contains('dark');
  const hybridScore = useMemo(() => calculateHybridScore(trades || []), [trades]);

  if (!hybridScore) {
    return (
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            <Award className="h-5 w-5" /> Hybrid Score™
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Add realized trades to establish your Hybrid Score baseline.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { totalScore, level, components, stats, sampleSize } = hybridScore;
  const circumference = 440;
  const scoreDash = (totalScore / 100) * circumference;

  const rows = [
    { label: 'Edge', score: components.edge, icon: TrendingUp, detail: `PF ${stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} · Exp $${stats.expectancy.toFixed(2)}` },
    { label: 'Risk', score: components.risk, icon: ShieldCheck, detail: `Max DD $${stats.maxDrawdown.toFixed(2)} · ${stats.maxLossStreak} max losing streak` },
    { label: 'Consistency', score: components.consistency, icon: Activity, detail: `${stats.winRate.toFixed(1)}% decided-trade win rate` },
    { label: 'Discipline', score: components.discipline, icon: Brain, detail: `Payoff ${stats.payoffRatio === Infinity ? '∞' : stats.payoffRatio.toFixed(2)} · ${stats.breakevenTrades} breakeven` },
    { label: 'Data Confidence', score: components.dataConfidence, icon: Database, detail: `${sampleSize} realized trades analyzed` },
  ];

  const levelClass = totalScore >= 85
    ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
    : totalScore >= 75
      ? 'bg-gradient-to-r from-purple-500 to-pink-500'
      : totalScore >= 60
        ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
        : 'bg-gradient-to-r from-slate-500 to-slate-600';

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            <Award className="h-5 w-5" /> Hybrid Score™
          </CardTitle>
          <Badge variant="outline" className={darkMode ? 'border-cyan-500/30 text-cyan-300' : ''}>Explainable Score</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-center">
          <div className="text-center">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-40 h-40 transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke={darkMode ? '#1e293b' : '#e2e8f0'} strokeWidth="12" fill="none" />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  stroke="url(#hybridScoreGradient)"
                  strokeWidth="12"
                  fill="none"
                  strokeDasharray={`${scoreDash} ${circumference}`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="hybridScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute">
                <div className={`text-5xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{totalScore}</div>
                <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>out of 100</div>
              </div>
            </div>
            <div className="mt-3">
              <Badge className={`${levelClass} text-white px-4 py-1.5 font-bold`}>{level}</Badge>
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${darkMode ? 'bg-slate-900/50 border-cyan-500/10' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`text-sm font-semibold mb-3 ${darkMode ? 'text-white' : 'text-slate-900'}`}>What the score means</div>
            <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Hybrid Score combines profitability edge, drawdown/risk behavior, consistency, discipline proxies, and the confidence we have in the underlying trade data. It is designed to improve as verified history grows—not simply reward a short winning streak.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {rows.map(({ label, score, icon: Icon, detail }) => (
            <div key={label} className={`p-4 rounded-xl border ${darkMode ? 'bg-slate-900/50 border-cyan-500/10' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-cyan-500" />
                  <span className={`font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>{label}</span>
                </div>
                <span className={`text-lg font-bold ${darkMode ? 'text-cyan-300' : 'text-cyan-700'}`}>{score}</span>
              </div>
              <div className={`w-full rounded-full h-2 overflow-hidden ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500" style={{ width: `${score}%` }} />
              </div>
              <div className={`text-xs mt-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{detail}</div>
            </div>
          ))}
        </div>

        <div className={`p-4 rounded-xl border ${darkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'}`}>
          <div className={`text-sm font-semibold mb-2 ${darkMode ? 'text-cyan-300' : 'text-cyan-800'}`}>Next best improvement</div>
          <div className={`text-sm ${darkMode ? 'text-cyan-100/80' : 'text-cyan-900/80'}`}>
            {components.dataConfidence < 60
              ? 'Build more verified history and connect richer trade metadata so the score relies less on a small sample.'
              : components.risk < Math.min(components.edge, components.consistency)
                ? 'Your largest opportunity is risk quality: reduce drawdown depth and long losing streaks before increasing size.'
                : components.edge < components.consistency
                  ? 'Your execution is relatively consistent, but expectancy/profit factor needs improvement. Focus on setup selection and reward-to-risk.'
                  : 'Protect the edge. Keep sizing and execution consistent while adding more verified data.'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
