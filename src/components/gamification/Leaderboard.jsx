import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, TrendingUp, Target, Flame, Medal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function Leaderboard() {
  const darkMode = document.documentElement.classList.contains('dark');
  const [period, setPeriod] = useState('weekly');

  const { data: achievements = [] } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: async () => {
      const allAchievements = await base44.entities.Achievement.list('-total_points', 50);
      return allAchievements;
    }
  });

  const { data: currentUser } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500 fill-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-slate-400 fill-slate-400" />;
      case 3: return <Medal className="h-5 w-5 text-orange-600 fill-orange-600" />;
      default: return <span className={`text-sm font-bold ${darkMode ? 'text-slate-500' : 'text-slate-600'}`}>#{rank}</span>;
    }
  };

  const getRankBg = (rank) => {
    switch (rank) {
      case 1: return darkMode ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200';
      case 2: return darkMode ? 'bg-slate-800/50 border-slate-500/30' : 'bg-slate-50 border-slate-200';
      case 3: return darkMode ? 'bg-orange-900/20 border-orange-500/30' : 'bg-orange-50 border-orange-200';
      default: return darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
    }
  };

  const userRank = achievements.findIndex(a => a.user_email === currentUser?.email) + 1;

  return (
    <Card className={darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
          <Trophy className="h-5 w-5" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="points" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="points">Points</TabsTrigger>
            <TabsTrigger value="streak">Streak</TabsTrigger>
            <TabsTrigger value="level">Level</TabsTrigger>
          </TabsList>

          <TabsContent value="points" className="space-y-2">
            {userRank > 0 && userRank <= 10 && (
              <div className={`p-3 rounded-lg border mb-4 ${darkMode ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">{userRank}</span>
                    </div>
                    <div>
                      <div className={`font-bold ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>You</div>
                      <div className={`text-xs ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>Your rank</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {achievements[userRank - 1]?.total_points.toLocaleString() || 0}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>points</div>
                  </div>
                </div>
              </div>
            )}

            {achievements.slice(0, 10).map((achievement, idx) => (
              <div
                key={achievement.id}
                className={`p-3 rounded-lg border ${getRankBg(idx + 1)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRankIcon(idx + 1)}
                    <div>
                      <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {achievement.user_email.split('@')[0]}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Level {achievement.level}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {achievement.total_points.toLocaleString()}
                    </div>
                    <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>points</div>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="streak" className="space-y-2">
            {[...achievements].sort((a, b) => (b.streak_days || 0) - (a.streak_days || 0)).slice(0, 10).map((achievement, idx) => (
              <div
                key={achievement.id}
                className={`p-3 rounded-lg border ${getRankBg(idx + 1)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRankIcon(idx + 1)}
                    <div>
                      <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {achievement.user_email.split('@')[0]}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                      {achievement.streak_days || 0} days
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="level" className="space-y-2">
            {[...achievements].sort((a, b) => (b.level || 1) - (a.level || 1)).slice(0, 10).map((achievement, idx) => (
              <div
                key={achievement.id}
                className={`p-3 rounded-lg border ${getRankBg(idx + 1)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getRankIcon(idx + 1)}
                    <div>
                      <div className={`font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {achievement.user_email.split('@')[0]}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white">
                    Level {achievement.level || 1}
                  </Badge>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}