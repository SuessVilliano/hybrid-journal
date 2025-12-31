import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Star, Flame, TrendingUp, Award, Zap } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export default function AchievementCard({ achievement }) {
  const darkMode = document.documentElement.classList.contains('dark');
  
  const xpForNextLevel = achievement.level * 1000;
  const xpProgress = (achievement.experience / xpForNextLevel) * 100;

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-bold text-white">{achievement.level}</span>
            </div>
            <div>
              <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Trader Level</div>
              <div className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                Level {achievement.level}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Points</div>
            <div className={`text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent`}>
              {achievement.total_points.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className={darkMode ? 'text-slate-400' : 'text-slate-600'}>Progress to Level {achievement.level + 1}</span>
            <span className={darkMode ? 'text-cyan-400' : 'text-cyan-600'}>
              {achievement.experience}/{xpForNextLevel} XP
            </span>
          </div>
          <Progress value={xpProgress} className="h-2" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Streak</span>
            </div>
            <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {achievement.streak_days}d
            </div>
          </div>

          <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Trades</span>
            </div>
            <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {achievement.stats?.trades_logged || 0}
            </div>
          </div>

          <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Plans</span>
            </div>
            <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {achievement.stats?.plans_created || 0}
            </div>
          </div>

          <div className={`p-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-4 w-4 text-purple-500" />
              <span className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Badges</span>
            </div>
            <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {achievement.badges_earned?.length || 0}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}