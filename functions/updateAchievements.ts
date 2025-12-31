import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const BADGE_DEFINITIONS = [
  { id: 'first_trade', name: 'First Trade', description: 'Log your first trade', icon: 'trophy', tier: 'bronze', points: 50, criteria: { trades_logged: 1 } },
  { id: 'streak_7', name: '7-Day Streak', description: '7 consecutive days of activity', icon: 'flame', tier: 'silver', points: 100, criteria: { streak_days: 7 } },
  { id: 'streak_30', name: '30-Day Streak', description: '30 consecutive days of activity', icon: 'flame', tier: 'gold', points: 500, criteria: { streak_days: 30 } },
  { id: 'trades_100', name: 'Century', description: 'Log 100 trades', icon: 'trending', tier: 'gold', points: 300, criteria: { trades_logged: 100 } },
  { id: 'trades_500', name: 'Professional', description: 'Log 500 trades', icon: 'trending', tier: 'platinum', points: 1000, criteria: { trades_logged: 500 } },
  { id: 'plans_30', name: 'Planner', description: 'Create 30 daily plans', icon: 'star', tier: 'silver', points: 200, criteria: { plans_created: 30 } },
  { id: 'perfect_week', name: 'Perfect Week', description: 'Follow your plan 7 days straight', icon: 'target', tier: 'gold', points: 400, criteria: { perfect_plan_days: 7 } },
  { id: 'goals_10', name: 'Goal Master', description: 'Complete 10 goals', icon: 'award', tier: 'platinum', points: 800, criteria: { goals_completed: 10 } }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action_type } = await req.json();

    // Get or create achievement record
    let achievements = await base44.entities.Achievement.filter({ user_email: user.email });
    let achievement = achievements[0];
    
    if (!achievement) {
      achievement = await base44.entities.Achievement.create({
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
      });
    }

    // Count actual data
    const trades = await base44.entities.Trade.filter({ created_by: user.email });
    const plans = await base44.entities.DailyTradePlan.filter({ created_by: user.email });
    const journals = await base44.entities.JournalEntry.filter({ created_by: user.email });
    const goals = await base44.entities.Goal.filter({ created_by: user.email, status: 'completed' });

    // Update streak
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = achievement.last_activity_date;
    let newStreak = achievement.streak_days || 0;
    
    if (lastActivity !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      if (lastActivity === yesterdayStr) {
        newStreak += 1;
      } else if (!lastActivity) {
        newStreak = 1;
      } else {
        newStreak = 1;
      }
    }

    // Update stats
    const newStats = {
      trades_logged: trades.length,
      plans_created: plans.length,
      journal_entries: journals.length,
      goals_completed: goals.length,
      perfect_plan_days: achievement.stats?.perfect_plan_days || 0
    };

    // Calculate XP based on action
    let xpGain = 0;
    if (action_type === 'trade') xpGain = 10;
    if (action_type === 'plan') xpGain = 25;
    if (action_type === 'journal') xpGain = 15;
    if (action_type === 'goal') xpGain = 50;

    const newXP = (achievement.experience || 0) + xpGain;
    const xpForNextLevel = achievement.level * 1000;
    let newLevel = achievement.level;
    let finalXP = newXP;

    if (newXP >= xpForNextLevel) {
      newLevel += 1;
      finalXP = newXP - xpForNextLevel;
    }

    // Check for new badges
    const earnedBadges = achievement.badges_earned || [];
    const newBadges = [];
    let pointsFromBadges = 0;

    for (const badgeDef of BADGE_DEFINITIONS) {
      if (earnedBadges.includes(badgeDef.id)) continue;

      let earned = false;
      if (badgeDef.criteria.trades_logged && newStats.trades_logged >= badgeDef.criteria.trades_logged) earned = true;
      if (badgeDef.criteria.plans_created && newStats.plans_created >= badgeDef.criteria.plans_created) earned = true;
      if (badgeDef.criteria.goals_completed && newStats.goals_completed >= badgeDef.criteria.goals_completed) earned = true;
      if (badgeDef.criteria.streak_days && newStreak >= badgeDef.criteria.streak_days) earned = true;
      if (badgeDef.criteria.perfect_plan_days && newStats.perfect_plan_days >= badgeDef.criteria.perfect_plan_days) earned = true;

      if (earned) {
        newBadges.push(badgeDef);
        earnedBadges.push(badgeDef.id);
        pointsFromBadges += badgeDef.points;

        // Create Badge entity
        await base44.entities.Badge.create({
          user_email: user.email,
          badge_id: badgeDef.id,
          badge_name: badgeDef.name,
          badge_description: badgeDef.description,
          badge_icon: badgeDef.icon,
          badge_tier: badgeDef.tier,
          earned_date: new Date().toISOString(),
          points_awarded: badgeDef.points
        });
      }
    }

    // Update achievement
    const updatedAchievement = await base44.entities.Achievement.update(achievement.id, {
      total_points: (achievement.total_points || 0) + xpGain + pointsFromBadges,
      level: newLevel,
      experience: finalXP,
      streak_days: newStreak,
      longest_streak: Math.max(newStreak, achievement.longest_streak || 0),
      last_activity_date: today,
      stats: newStats,
      badges_earned: earnedBadges
    });

    return Response.json({ 
      success: true,
      achievement: updatedAchievement,
      new_badges: newBadges,
      xp_gained: xpGain
    });

  } catch (error) {
    console.error('Achievement update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});