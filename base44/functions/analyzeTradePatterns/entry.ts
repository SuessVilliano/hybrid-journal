import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { analysis_type, timeframe_days = 30 } = await req.json();
    
    const startDate = new Date(Date.now() - timeframe_days * 24 * 60 * 60 * 1000).toISOString();
    
    // Fetch all relevant data
    const [trades, plans, journals] = await Promise.all([
      base44.entities.Trade.filter({ created_by: user.email }),
      base44.entities.DailyTradePlan.filter({ created_by: user.email }),
      base44.entities.JournalEntry.filter({ created_by: user.email })
    ]);

    // Filter by timeframe
    const recentTrades = trades.filter(t => t.entry_date >= startDate);
    const recentPlans = plans.filter(p => p.date >= startDate);
    const recentJournals = journals.filter(j => j.date >= startDate);

    let analysis = {};

    switch (analysis_type) {
      case 'plan_effectiveness':
        analysis = await analyzePlanEffectiveness(recentTrades, recentPlans, base44);
        break;
      
      case 'sentiment_trends':
        analysis = await analyzeSentimentTrends(recentJournals, recentTrades, base44);
        break;
      
      case 'mood_correlation':
        analysis = await analyzeMoodCorrelation(recentJournals, recentTrades, base44);
        break;
      
      case 'trading_patterns':
        analysis = await identifyTradingPatterns(recentTrades, recentJournals, base44);
        break;
      
      case 'comprehensive':
        const [planEff, sentiment, mood, patterns] = await Promise.all([
          analyzePlanEffectiveness(recentTrades, recentPlans, base44),
          analyzeSentimentTrends(recentJournals, recentTrades, base44),
          analyzeMoodCorrelation(recentJournals, recentTrades, base44),
          identifyTradingPatterns(recentTrades, recentJournals, base44)
        ]);
        analysis = { planEff, sentiment, mood, patterns };
        break;
      
      default:
        return Response.json({ error: 'Invalid analysis_type' }, { status: 400 });
    }

    return Response.json({
      success: true,
      analysis,
      timeframe_days,
      data_points: {
        trades: recentTrades.length,
        plans: recentPlans.length,
        journals: recentJournals.length
      }
    });

  } catch (error) {
    console.error('Pattern analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function analyzePlanEffectiveness(trades, plans, base44) {
  // Collect all chart screenshots from plans
  const chartScreenshots = plans
    .filter(p => p.chart_screenshots && p.chart_screenshots.length > 0)
    .flatMap(p => p.chart_screenshots)
    .slice(0, 5); // Limit to 5 images for API efficiency

  const prompt = `Analyze trade plan effectiveness by reviewing both written plans AND uploaded chart screenshots:

DAILY PLANS (${plans.length} total):
${plans.slice(0, 10).map(p => `
Date: ${p.date}
Plan: ${p.plan_text?.substring(0, 200)}
Markets to Watch: ${p.markets_to_watch?.join(', ')}
Max Trades Planned: ${p.max_trades}
Max Risk: $${p.max_risk}
Chart Screenshots Uploaded: ${p.chart_screenshots?.length || 0}
`).join('\n')}

${chartScreenshots.length > 0 ? `
IMPORTANT: I have attached ${chartScreenshots.length} chart screenshot(s) from these trade plans. 
Analyze the visual charts to assess:
- Quality of support/resistance levels marked
- Entry/exit points identified
- Risk management zones (stop loss, take profit)
- Chart patterns and setups
- Market structure analysis
- Does the chart align with the written plan?
` : ''}

ACTUAL TRADES EXECUTED (${trades.length} total):
${trades.slice(0, 20).map(t => `
Date: ${t.entry_date}
Symbol: ${t.symbol}
Side: ${t.side}
P&L: $${t.pnl}
Linked Plan: ${t.linked_daily_plan_id ? 'Yes' : 'No'}
`).join('\n')}

Analyze:
1. Plan adherence rate: How many trades aligned with daily plans?
2. Plan quality: Did planned trades perform better than unplanned ones?
3. Risk management: Did traders stay within planned risk limits?
4. Missed opportunities: Planned setups that weren't executed?
5. Impulsive trades: Trades taken outside of plan?
6. Recommendations for improving plan effectiveness

Provide actionable insights.`;

  const schema = {
    type: "object",
    properties: {
      adherence_rate: { type: "number", description: "Percentage of trades that followed the plan" },
      planned_vs_unplanned_performance: {
        type: "object",
        properties: {
          planned_avg_pnl: { type: "number" },
          unplanned_avg_pnl: { type: "number" },
          planned_win_rate: { type: "number" },
          unplanned_win_rate: { type: "number" }
        }
      },
      risk_adherence: {
        type: "object",
        properties: {
          stayed_within_limits: { type: "boolean" },
          days_exceeded_risk: { type: "number" },
          avg_risk_per_trade: { type: "number" }
        }
      },
      missed_opportunities: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string" },
            setup: { type: "string" },
            reason: { type: "string" }
          }
        }
      },
      impulsive_trades: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string" },
            symbol: { type: "string" },
            result: { type: "string" },
            likely_trigger: { type: "string" }
          }
        }
      },
      recommendations: {
        type: "array",
        items: { type: "string" }
      },
      overall_score: { type: "number", description: "Plan effectiveness score 0-100" },
      chart_analysis: {
        type: "object",
        properties: {
          charts_reviewed: { type: "number" },
          technical_quality: { type: "string" },
          alignment_with_plan: { type: "string" }
        }
      }
    }
  };

  return await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: schema
  });
}

async function analyzeSentimentTrends(journals, trades, base44) {
  const prompt = `Analyze journal entry sentiment trends over time:

JOURNAL ENTRIES (${journals.length} total):
${journals.map(j => `
Date: ${j.date}
Content: ${j.content?.substring(0, 150)}
Mood Tags: ${j.mood_tags?.join(', ')}
Entry Type: ${j.entry_type}
AI Sentiment: ${j.ai_sentiment}
`).join('\n')}

TRADES CONTEXT:
${trades.slice(0, 10).map(t => `${t.entry_date}: ${t.symbol} ${t.side} P&L: $${t.pnl}`).join('\n')}

Analyze:
1. Sentiment trend: Is it improving, declining, or stable?
2. Emotional patterns: What emotions appear most frequently?
3. Sentiment-performance correlation: Do positive sentiments correlate with better trading?
4. Red flags: Patterns indicating stress, burnout, or emotional trading?
5. Breakthrough moments: Positive shifts in mindset?
6. Weekly/monthly sentiment cycles?`;

  const schema = {
    type: "object",
    properties: {
      overall_trend: { type: "string", enum: ["improving", "declining", "stable", "volatile"] },
      sentiment_score_change: { type: "number", description: "Change from start to end of period" },
      dominant_emotions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            emotion: { type: "string" },
            frequency: { type: "number" },
            impact_on_performance: { type: "string" }
          }
        }
      },
      sentiment_performance_correlation: {
        type: "object",
        properties: {
          positive_sentiment_avg_pnl: { type: "number" },
          negative_sentiment_avg_pnl: { type: "number" },
          correlation_strength: { type: "string", enum: ["strong", "moderate", "weak", "none"] }
        }
      },
      red_flags: {
        type: "array",
        items: {
          type: "object",
          properties: {
            flag: { type: "string" },
            severity: { type: "string", enum: ["low", "medium", "high"] },
            dates: { type: "array", items: { type: "string" } }
          }
        }
      },
      breakthrough_moments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            date: { type: "string" },
            insight: { type: "string" }
          }
        }
      },
      recommendations: {
        type: "array",
        items: { type: "string" }
      }
    }
  };

  return await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: schema
  });
}

async function analyzeMoodCorrelation(journals, trades, base44) {
  const prompt = `Analyze correlation between mood/emotions and trading performance:

JOURNAL + TRADE DATA:
${journals.map((j, idx) => {
    const dayTrades = trades.filter(t => t.entry_date?.startsWith(j.date?.substring(0, 10)));
    const dayPnL = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    return `
Date: ${j.date}
Mood: ${j.mood_tags?.join(', ')}
Content Snippet: ${j.content?.substring(0, 100)}
Trades that day: ${dayTrades.length}
Day P&L: $${dayPnL.toFixed(2)}
`;
  }).slice(0, 20).join('\n')}

Analyze:
1. Which emotions lead to best trading performance?
2. Which emotions lead to worst trading performance?
3. Time-of-day patterns (morning vs afternoon mood)?
4. Emotional cycles: Weekly patterns?
5. Recovery patterns: How quickly does mood improve after losses?
6. Pre-trade emotional states that predict success?`;

  const schema = {
    type: "object",
    properties: {
      best_performing_moods: {
        type: "array",
        items: {
          type: "object",
          properties: {
            mood: { type: "string" },
            avg_pnl: { type: "number" },
            win_rate: { type: "number" },
            sample_size: { type: "number" }
          }
        }
      },
      worst_performing_moods: {
        type: "array",
        items: {
          type: "object",
          properties: {
            mood: { type: "string" },
            avg_pnl: { type: "number" },
            win_rate: { type: "number" },
            sample_size: { type: "number" }
          }
        }
      },
      emotional_cycles: {
        type: "object",
        properties: {
          weekly_pattern: { type: "string" },
          best_day: { type: "string" },
          worst_day: { type: "string" }
        }
      },
      recovery_patterns: {
        type: "object",
        properties: {
          avg_recovery_time_days: { type: "number" },
          resilience_score: { type: "number", description: "0-100" }
        }
      },
      predictive_states: {
        type: "array",
        items: {
          type: "object",
          properties: {
            state: { type: "string" },
            success_probability: { type: "number" },
            recommendation: { type: "string" }
          }
        }
      },
      insights: {
        type: "array",
        items: { type: "string" }
      }
    }
  };

  return await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: schema
  });
}

async function identifyTradingPatterns(trades, journals, base44) {
  const prompt = `Identify specific trading patterns and behavioral issues:

TRADES SEQUENCE (${trades.length} total):
${trades.map((t, idx) => `
#${idx + 1} | ${t.entry_date} | ${t.symbol} | ${t.side} | P&L: $${t.pnl} | ${t.pnl > 0 ? 'WIN' : 'LOSS'}
`).join('\n')}

JOURNAL CONTEXT (emotional state):
${journals.slice(0, 10).map(j => `${j.date}: ${j.mood_tags?.join(', ')}`).join('\n')}

Identify these specific patterns:
1. OVERTRADING AFTER LOSSES: Multiple trades immediately after big losses?
2. REVENGE TRADING: Increasing position sizes after losses?
3. FEAR AFTER WINS: Taking profits too early after winning streak?
4. MISSING ENTRIES: Hesitation during high volatility?
5. WEEKEND EFFECT: Performance difference around weekends?
6. TIME OF DAY PATTERNS: Best/worst performance by hour?
7. STREAK BEHAVIOR: How do winning/losing streaks affect next trade?
8. SCALING ISSUES: Position sizing inconsistencies?
9. OVERCONFIDENCE: Larger positions after wins?
10. ANALYSIS PARALYSIS: Taking too long to enter?

For each pattern found, provide:
- Pattern name
- Frequency (how often it occurs)
- Impact on P&L
- Specific examples with dates
- Root cause analysis
- Actionable fix`;

  const schema = {
    type: "object",
    properties: {
      patterns_identified: {
        type: "array",
        items: {
          type: "object",
          properties: {
            pattern_name: { type: "string" },
            severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
            frequency: { type: "number", description: "Times observed" },
            impact_on_pnl: { type: "number", description: "Estimated $ impact" },
            examples: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  date: { type: "string" },
                  description: { type: "string" }
                }
              }
            },
            root_cause: { type: "string" },
            fix: { type: "string" }
          }
        }
      },
      positive_patterns: {
        type: "array",
        items: {
          type: "object",
          properties: {
            pattern_name: { type: "string" },
            description: { type: "string" },
            consistency_score: { type: "number" }
          }
        }
      },
      overall_behavior_score: { type: "number", description: "0-100" },
      priority_fixes: {
        type: "array",
        items: { type: "string" }
      }
    }
  };

  return await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: schema
  });
}