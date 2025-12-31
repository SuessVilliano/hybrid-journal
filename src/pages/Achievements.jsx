import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AchievementCard from '@/components/gamification/AchievementCard';
import BadgeGallery from '@/components/gamification/BadgeGallery';
import Leaderboard from '@/components/gamification/Leaderboard';
import { Trophy } from 'lucide-react';

export default function Achievements() {
  const darkMode = document.documentElement.classList.contains('dark');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: achievement, isLoading } = useQuery({
    queryKey: ['achievement', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const achievements = await base44.entities.Achievement.filter({ user_email: user.email });
      return achievements[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return await base44.entities.Badge.filter({ user_email: user.email }, '-earned_date', 100);
    },
    enabled: !!user?.email
  });

  const createAchievementMutation = useMutation({
    mutationFn: () => base44.entities.Achievement.create({
      user_email: user.email,
      total_points: 0,
      level: 1,
      experience: 0,
      streak_days: 0,
      longest_streak: 0,
      badges_earned: [],
      stats: {
        trades_logged: 0,
        plans_created: 0,
        journal_entries: 0,
        goals_completed: 0,
        perfect_plan_days: 0
      }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['achievement']);
    }
  });

  useEffect(() => {
    if (user?.email && !isLoading && !achievement) {
      createAchievementMutation.mutate();
    }
  }, [user, achievement, isLoading]);

  if (isLoading) {
    return (
      <div className={`min-h-screen p-6 ${
        darkMode 
          ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
          : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
      }`}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-6 transition-colors ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' 
        : 'bg-gradient-to-br from-cyan-50 via-purple-50 to-pink-50'
    }`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className={`text-3xl md:text-4xl font-bold bg-gradient-to-r ${
            darkMode ? 'from-cyan-400 to-purple-500' : 'from-cyan-600 to-purple-600'
          } bg-clip-text text-transparent`}>
            Achievements & Leaderboard
          </h1>
          <p className={darkMode ? 'text-cyan-400/70 mt-1' : 'text-cyan-700/70 mt-1'}>
            Track your progress, earn badges, and compete with other traders
          </p>
        </div>

        {achievement && <AchievementCard achievement={achievement} />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BadgeGallery earnedBadges={badges} />
          <Leaderboard />
        </div>
      </div>
    </div>
  );
}