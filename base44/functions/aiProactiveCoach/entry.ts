import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Proactive AI Trading Coach
 * Monitors trader behavior and sends proactive alerts/notifications
 * Called by scheduled automation or triggered by trade events
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { user_email, check_type = 'daily' } = payload;

    // Get trader profile
    const profiles = await base44.asServiceRole.entities.TraderProfile.filter({ 
      created_by: user_email 
    });
    
    if (profiles.length === 0) {
      return Response.json({ 
        success: false, 
        message: 'No trader profile found' 
      });
    }

    const profile = profiles[0];
    
    // Skip if proactive alerts disabled
    if (!profile.ai_coaching_preferences?.proactive_alerts) {
      return Response.json({ 
        success: true, 
        message: 'Proactive alerts disabled for user' 
      });
    }

    const notifications = [];

    // Get recent trades (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentTrades = await base44.asServiceRole.entities.Trade.filter({
      created_by: user_email
    });
    const filtered = recentTrades.filter(t => new Date(t.created_date) > new Date(sevenDaysAgo));

    // Today's trades
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = filtered.filter(t => t.entry_date?.startsWith(today));

    // Check 1: Rule Enforcement - Overtrading
    if (profile.ai_coaching_preferences?.rule_enforcement) {
      const maxTrades = profile.risk_tolerance?.includes('Conservative') ? 3 : 5;
      if (todayTrades.length >= maxTrades) {
        notifications.push({
          type: 'risk_warning',
          title: '⚠️ Daily Trade Limit Reached',
          message: `You've taken ${todayTrades.length} trades today. Your profile suggests a max of ${maxTrades}. Consider taking a break to avoid overtrading.`,
          priority: 'high',
          link: '/Trades'
        });
      }
    }

    // Check 2: Risk Management - Daily Loss
    if (profile.notification_preferences?.risk_warnings) {
      const todayPnL = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const riskPercent = parseFloat(profile.risk_tolerance?.match(/[\d.]+/)?.[0] || 1);
      const maxDailyLoss = riskPercent * 5; // 5 trades worth

      if (todayPnL < 0 && Math.abs(todayPnL) > (maxDailyLoss * 100)) {
        notifications.push({
          type: 'risk_warning',
          title: '🛑 Daily Loss Limit Approaching',
          message: `Current P&L: $${todayPnL.toFixed(2)}. Consider stepping away for today to protect your capital.`,
          priority: 'urgent',
          link: '/Analytics'
        });
      }
    }

    // Check 3: Performance Feedback - Win Streak
    if (profile.ai_coaching_preferences?.performance_feedback) {
      const lastFiveTrades = filtered.slice(0, 5);
      const winStreak = lastFiveTrades.every(t => t.pnl > 0);
      
      if (winStreak && lastFiveTrades.length >= 3) {
        notifications.push({
          type: 'goal_achieved',
          title: '🎉 Win Streak Detected!',
          message: `Great job! You're on a ${lastFiveTrades.length}-trade win streak. Stay disciplined and stick to your plan.`,
          priority: 'medium',
          link: '/Analytics'
        });
      }

      // Loss Streak
      const lossStreak = lastFiveTrades.every(t => t.pnl < 0);
      if (lossStreak && lastFiveTrades.length >= 3) {
        notifications.push({
          type: 'risk_warning',
          title: '📊 Performance Alert',
          message: `You're experiencing a losing streak. Review your trades and consider taking a break or adjusting your approach.`,
          priority: 'high',
          link: '/TradePlans'
        });
      }
    }

    // Check 4: Emotional Check-ins
    if (profile.ai_coaching_preferences?.emotional_check_ins) {
      const recentEmotions = filtered
        .filter(t => t.emotion_during)
        .slice(0, 5)
        .map(t => t.emotion_during);

      const negativeEmotions = ['Anxious', 'Fearful', 'Impulsive'];
      const negativeCount = recentEmotions.filter(e => negativeEmotions.includes(e)).length;

      if (negativeCount >= 3) {
        notifications.push({
          type: 'user_alert',
          title: '🧠 Emotional Pattern Detected',
          message: `You've reported feeling ${recentEmotions[0]} in recent trades. Consider journaling or taking a mindful break before your next trade.`,
          priority: 'medium',
          link: '/Journal'
        });
      }
    }

    // Check 5: Daily Reminders
    if (profile.notification_preferences?.daily_reminders && check_type === 'daily') {
      const todayPlans = await base44.asServiceRole.entities.DailyTradePlan.filter({
        created_by: user_email,
        date: today
      });

      if (todayPlans.length === 0 && todayTrades.length > 0) {
        notifications.push({
          type: 'plan_reminder',
          title: '📝 Missing Trade Plan',
          message: `You've taken ${todayTrades.length} trades today without a plan. Create one now to stay accountable.`,
          priority: 'medium',
          link: '/TradePlans'
        });
      }
    }

    // Check 6: Goal Progress
    if (profile.notification_preferences?.milestone_achievements) {
      const totalPnL = filtered.reduce((sum, t) => sum + (t.pnl || 0), 0);
      
      if (totalPnL > 1000) {
        const milestones = await base44.asServiceRole.entities.Notification.filter({
          recipient_email: user_email,
          title: '🎯 Weekly Profit Milestone!'
        });

        if (milestones.length === 0) {
          notifications.push({
            type: 'goal_achieved',
            title: '🎯 Weekly Profit Milestone!',
            message: `Amazing! You've made $${totalPnL.toFixed(2)} this week. Keep up the great work!`,
            priority: 'medium',
            link: '/Achievements'
          });
        }
      }
    }

    // Create all notifications
    for (const notif of notifications) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: user_email,
        ...notif
      });
    }

    return Response.json({
      success: true,
      notifications_sent: notifications.length,
      checks_performed: check_type
    });

  } catch (error) {
    console.error('Proactive coach error:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});