import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Update user achievements and award badges
 * Called when user performs trackable actions
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { action, metadata = {} } = payload;

    // Use service role for all achievement writes (user RLS blocks backend updates)
    const svc = base44.asServiceRole;

    // Fetch or create achievement record
    let achievements = await svc.entities.Achievement.filter({ user_email: user.email });
    let achievement = achievements[0];

    if (!achievement) {
      achievement = await svc.entities.Achievement.create({
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
    };
    }

    // Award points and update stats based on action
    const pointsMap = {
      'trade_logged': 10,
      'plan_created': 25,
      'journal_entry': 15,
      'goal_completed': 50,
      'perfect_plan_day': 100,
      'first_trade': 50,
      'first_plan': 50,
      'first_journal': 25
    };

    const points = pointsMap[action] || 0;
    const newXP = (achievement.experience || 0) + points;
    const currentLevel = achievement.level || 1;
    const xpForNextLevel = currentLevel * 1000;

    let newLevel = currentLevel;
    let remainingXP = newXP;

    // Level up if enough XP
    while (remainingXP >= (newLevel * 1000)) {
      remainingXP -= (newLevel * 1000);
      newLevel++;
    }

    // Update stats
    const newStats = { ...achievement.stats };
    if (action === 'trade_logged') newStats.trades_logged = (newStats.trades_logged || 0) + 1;
    if (action === 'plan_created') newStats.plans_created = (newStats.plans_created || 0) + 1;
    if (action === 'journal_entry') newStats.journal_entries = (newStats.journal_entries || 0) + 1;
    if (action === 'goal_completed') newStats.goals_completed = (newStats.goals_completed || 0) + 1;
    if (action === 'perfect_plan_day') newStats.perfect_plan_days = (newStats.perfect_plan_days || 0) + 1;

    // Check for badge unlocks
    const newBadges = [];
    const earnedBadgeIds = achievement.badges_earned || [];

    // First trade badge
    if (action === 'trade_logged' && newStats.trades_logged === 1 && !earnedBadgeIds.includes('first_trade')) {
      const badge = await svc.entities.Badge.create({
    if (action === 'trade_logged' && newStats.trades_logged === 100 && !earnedBadgeIds.includes('century_trader')) {
      const badge = await svc.entities.Badge.create({
    if (achievement.streak_days === 7 && !earnedBadgeIds.includes('week_warrior')) {
      const badge = await svc.entities.Badge.create({
    const updated = await svc.entities.Achievement.update(achievement.id, {
      total_points: (achievement.total_points || 0) + points + newBadges.reduce((sum, b) => sum + (b.points_awarded || 0), 0),
      level: newLevel,
      experience: remainingXP,
      stats: newStats,
      badges_earned: earnedBadgeIds,
      last_activity_date: new Date().toISOString().split('T')[0]
    });

    return Response.json({
      success: true,
      points_awarded: points,
      new_level: newLevel > currentLevel ? newLevel : null,
      badges_unlocked: newBadges,
      achievement: updated
    });

  } catch (error) {
    console.error('Achievement update error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});