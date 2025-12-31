import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge as BadgeUI } from '@/components/ui/badge';
import { Trophy, Star, Flame, Target, Award, Zap, Shield, Brain, TrendingUp, Lock } from 'lucide-react';

const BADGE_DEFINITIONS = [
  { id: 'first_trade', name: 'First Trade', description: 'Log your first trade', icon: 'trophy', tier: 'bronze', points: 50 },
  { id: 'streak_7', name: '7-Day Streak', description: '7 consecutive days of activity', icon: 'flame', tier: 'silver', points: 100 },
  { id: 'streak_30', name: '30-Day Streak', description: '30 consecutive days of activity', icon: 'flame', tier: 'gold', points: 500 },
  { id: 'trades_100', name: 'Century', description: 'Log 100 trades', icon: 'trending', tier: 'gold', points: 300 },
  { id: 'trades_500', name: 'Professional', description: 'Log 500 trades', icon: 'trending', tier: 'platinum', points: 1000 },
  { id: 'plans_30', name: 'Planner', description: 'Create 30 daily plans', icon: 'star', tier: 'silver', points: 200 },
  { id: 'perfect_week', name: 'Perfect Week', description: 'Follow your plan 7 days straight', icon: 'target', tier: 'gold', points: 400 },
  { id: 'positive_month', name: 'Profitable Month', description: 'Finish a month in profit', icon: 'trending', tier: 'gold', points: 500 },
  { id: 'goal_master', name: 'Goal Master', description: 'Complete 10 goals', icon: 'award', tier: 'platinum', points: 800 },
  { id: 'consistency_king', name: 'Consistency King', description: '70%+ win rate over 100 trades', icon: 'shield', tier: 'legendary', points: 2000 }
];

const iconMap = {
  trophy: Trophy,
  flame: Flame,
  star: Star,
  target: Target,
  award: Award,
  zap: Zap,
  shield: Shield,
  brain: Brain,
  trending: TrendingUp
};

const tierColors = {
  bronze: 'from-orange-600 to-orange-800',
  silver: 'from-slate-400 to-slate-600',
  gold: 'from-yellow-400 to-yellow-600',
  platinum: 'from-cyan-400 to-blue-600',
  legendary: 'from-purple-500 to-pink-600'
};

export default function BadgeGallery({ earnedBadges }) {
  const darkMode = document.documentElement.classList.contains('dark');
  const earnedBadgeIds = earnedBadges?.map(b => b.badge_id) || [];

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Award className="h-5 w-5" />
          Badge Collection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {BADGE_DEFINITIONS.map((badge) => {
            const Icon = iconMap[badge.icon] || Trophy;
            const isEarned = earnedBadgeIds.includes(badge.id);

            return (
              <div
                key={badge.id}
                className={`p-4 rounded-lg border text-center transition-all ${
                  isEarned
                    ? `bg-gradient-to-br ${tierColors[badge.tier]} border-transparent shadow-lg`
                    : darkMode
                    ? 'bg-slate-900 border-slate-700 opacity-40'
                    : 'bg-slate-100 border-slate-300 opacity-40'
                }`}
              >
                <div className="relative">
                  <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center ${
                    isEarned ? 'bg-white/20' : darkMode ? 'bg-slate-800' : 'bg-slate-200'
                  }`}>
                    {isEarned ? (
                      <Icon className="h-6 w-6 text-white" />
                    ) : (
                      <Lock className={`h-6 w-6 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} />
                    )}
                  </div>
                  {isEarned && (
                    <BadgeUI className="absolute -top-1 -right-1 bg-yellow-500 text-yellow-900 text-xs px-2">
                      +{badge.points}
                    </BadgeUI>
                  )}
                </div>
                <div className={`text-sm font-bold mb-1 ${isEarned ? 'text-white' : darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  {badge.name}
                </div>
                <div className={`text-xs ${isEarned ? 'text-white/80' : darkMode ? 'text-slate-700' : 'text-slate-500'}`}>
                  {badge.description}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}