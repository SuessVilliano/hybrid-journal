import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Create trade templates based on trader profile from onboarding
 * Called after user completes onboarding
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    let user;
    try {
      user = await base44.auth.me();
    } catch (err) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get trader profile
    const profiles = await base44.entities.TraderProfile.list();
    if (profiles.length === 0) {
      return Response.json({ 
        success: true,
        message: 'No profile found yet - templates will be created later',
        templates_created: 0,
        goals_created: 0
      });
    }

    const profile = profiles[0];
    const templates = [];

    // Create templates based on their strategies
    for (const strategy of (profile.strategies || [])) {
      const template = {
        name: `${strategy} Template`,
        description: `Template for ${strategy} trades`,
        trading_style: profile.trader_type || 'Day Trading',
        default_fields: {
          strategy: strategy,
          instrument_type: profile.primary_markets?.[0] || 'Forex',
          session: profile.trading_session?.[0] || 'New York'
        },
        analysis_prompts: {
          pre_trade_plan: `Why does this ${strategy} setup meet my criteria? What are my entry, stop loss, and targets?`,
          post_trade_review: `Did I follow my ${strategy} rules? What did I execute well? What can I improve?`,
          notes: `Market conditions, ${strategy} signals observed, execution quality`
        },
        suggested_tags: [strategy, profile.trader_type, profile.primary_markets?.[0]].filter(Boolean),
        is_active: true
      };

      const created = await base44.entities.TradeTemplate.create(template);
      templates.push(created);
    }

    // Create default goals based on primary_goals
    const goals = [];
    for (const goalText of (profile.primary_goals || [])) {
      const goal = await base44.entities.Goal.create({
        title: goalText,
        description: `Working toward: ${goalText}`,
        goal_type: 'performance',
        status: 'in_progress',
        priority: 'high'
      });
      goals.push(goal);
    }

    return Response.json({
      success: true,
      templates_created: templates.length,
      goals_created: goals.length,
      templates,
      goals
    });

  } catch (error) {
    console.error('Template creation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});