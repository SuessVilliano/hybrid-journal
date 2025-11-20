import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, TrendingUp, Target, Calendar } from 'lucide-react';

export default function HybridScoreWidget({ trades }) {
  const darkMode = document.documentElement.classList.contains('dark');

  const hybridScore = useMemo(() => {
    if (!trades || trades.length === 0) return null;

    // Calculate Win Rate
    const winningTrades = trades.filter(t => t.pnl > 0);
    const winRate = (winningTrades.length / trades.length) * 100;
    
    let winRatePoints = 1;
    if (winRate >= 70) winRatePoints = 5;
    else if (winRate >= 60) winRatePoints = 4;
    else if (winRate >= 50) winRatePoints = 3;
    else if (winRate >= 40) winRatePoints = 2;

    // Calculate Profit Factor
    const totalWins = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 5 : 0;
    
    let profitFactorPoints = 1;
    if (profitFactor >= 3) profitFactorPoints = 5;
    else if (profitFactor >= 2) profitFactorPoints = 4;
    else if (profitFactor >= 1.5) profitFactorPoints = 3;
    else if (profitFactor >= 1) profitFactorPoints = 2;

    // Calculate Consistency (consecutive profitable weeks)
    const tradesByWeek = {};
    trades.forEach(t => {
      const date = new Date(t.entry_date);
      const weekKey = `${date.getFullYear()}-W${Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)}`;
      if (!tradesByWeek[weekKey]) tradesByWeek[weekKey] = 0;
      tradesByWeek[weekKey] += t.pnl || 0;
    });

    const weeks = Object.keys(tradesByWeek).sort();
    let maxConsecutiveWeeks = 0;
    let currentStreak = 0;
    
    weeks.forEach(week => {
      if (tradesByWeek[week] > 0) {
        currentStreak++;
        maxConsecutiveWeeks = Math.max(maxConsecutiveWeeks, currentStreak);
      } else {
        currentStreak = 0;
      }
    });

    let consistencyPoints = 1;
    if (maxConsecutiveWeeks >= 8) consistencyPoints = 5;
    else if (maxConsecutiveWeeks >= 6) consistencyPoints = 4;
    else if (maxConsecutiveWeeks >= 4) consistencyPoints = 3;
    else if (maxConsecutiveWeeks >= 2) consistencyPoints = 2;

    const totalScore = winRatePoints + profitFactorPoints + consistencyPoints;
    
    let level = 'Not Profitable';
    let levelColor = 'bg-red-500';
    if (totalScore >= 13) {
      level = 'Expert Trader';
      levelColor = 'bg-gradient-to-r from-yellow-500 to-orange-500';
    } else if (totalScore >= 10) {
      level = 'Advanced Trader';
      levelColor = 'bg-gradient-to-r from-purple-500 to-pink-500';
    } else if (totalScore >= 7) {
      level = 'Intermediate Trader';
      levelColor = 'bg-gradient-to-r from-blue-500 to-cyan-500';
    } else if (totalScore >= 4) {
      level = 'Beginner Trader';
      levelColor = 'bg-gradient-to-r from-green-500 to-emerald-500';
    }

    return {
      totalScore,
      maxScore: 15,
      level,
      levelColor,
      winRate: winRate.toFixed(1),
      winRatePoints,
      profitFactor: profitFactor.toFixed(2),
      profitFactorPoints,
      consistencyWeeks: maxConsecutiveWeeks,
      consistencyPoints
    };
  }, [trades]);

  if (!hybridScore) {
    return (
      <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            <Award className="h-5 w-5" />
            Hybrid Score™
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            No trades available. Start trading to calculate your Hybrid Score.
          </p>
        </CardContent>
      </Card>
    );
  }

  const scorePercentage = (hybridScore.totalScore / hybridScore.maxScore) * 100;

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white/80 border-cyan-500/30'}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            <Award className="h-5 w-5" />
            Hybrid Score™
          </CardTitle>
          <Badge className="text-xs">Patent Pending</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="text-center space-y-4">
          <div className="relative inline-flex items-center justify-center">
            <svg className="w-40 h-40 transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke={darkMode ? '#1e293b' : '#e2e8f0'}
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="url(#scoreGradient)"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${scorePercentage * 4.4} 440`}
                strokeLinecap="round"
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute">
              <div className={`text-5xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {hybridScore.totalScore}
              </div>
              <div className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                / {hybridScore.maxScore}
              </div>
            </div>
          </div>

          <div>
            <Badge className={`${hybridScore.levelColor} text-white px-4 py-2 text-lg font-bold`}>
              {hybridScore.level}
            </Badge>
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-4">
          <h3 className={`text-sm font-semibold ${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Score Breakdown
          </h3>

          {/* Win Rate */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className={`h-4 w-4 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Win Rate
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  {hybridScore.winRate}%
                </span>
                <Badge variant="outline" className={darkMode ? 'border-cyan-500/30 text-cyan-400' : ''}>
                  {hybridScore.winRatePoints}/5
                </Badge>
              </div>
            </div>
            <div className="w-full bg-slate-700/20 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(hybridScore.winRatePoints / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Profit Factor */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className={`h-4 w-4 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Profit Factor
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                  {hybridScore.profitFactor}
                </span>
                <Badge variant="outline" className={darkMode ? 'border-purple-500/30 text-purple-400' : ''}>
                  {hybridScore.profitFactorPoints}/5
                </Badge>
              </div>
            </div>
            <div className="w-full bg-slate-700/20 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
                style={{ width: `${(hybridScore.profitFactorPoints / 5) * 100}%` }}
              />
            </div>
          </div>

          {/* Consistency */}
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className={`h-4 w-4 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                  Consistency
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                  {hybridScore.consistencyWeeks} weeks
                </span>
                <Badge variant="outline" className={darkMode ? 'border-green-500/30 text-green-400' : ''}>
                  {hybridScore.consistencyPoints}/5
                </Badge>
              </div>
            </div>
            <div className="w-full bg-slate-700/20 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${(hybridScore.consistencyPoints / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Improvement Tips */}
        <div className={`p-4 rounded-lg border ${darkMode ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'}`}>
          <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
            💡 Focus Areas
          </h4>
          <ul className={`text-sm space-y-1 ${darkMode ? 'text-cyan-300/80' : 'text-cyan-700/80'}`}>
            {hybridScore.winRatePoints < 4 && <li>• Improve win rate by refining entry criteria</li>}
            {hybridScore.profitFactorPoints < 4 && <li>• Increase profit factor with better risk management</li>}
            {hybridScore.consistencyPoints < 4 && <li>• Build consistency with disciplined execution</li>}
            {hybridScore.totalScore >= 13 && <li>• Excellent! Maintain your edge and stay disciplined</li>}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}