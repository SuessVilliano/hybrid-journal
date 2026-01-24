import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { analysisType, dateRange, filters } = await req.json();

        // Fetch trades based on filters
        const queryFilter = { created_by: user.email };
        if (filters?.strategy) queryFilter.strategy = filters.strategy;
        if (filters?.setup) queryFilter.setup = filters.setup;
        if (filters?.source) queryFilter.source = filters.source;

        const allTrades = await base44.entities.Trade.filter(queryFilter);

        // Filter by date range if provided
        let trades = allTrades;
        if (dateRange) {
            const startDate = new Date(dateRange.start);
            const endDate = new Date(dateRange.end);
            trades = allTrades.filter(t => {
                const tradeDate = new Date(t.entry_date);
                return tradeDate >= startDate && tradeDate <= endDate;
            });
        }

        // Fetch account snapshots for drawdown analysis
        const snapshots = await base44.entities.AccountSnapshot.filter({
            user_email: user.email
        });

        // Fetch trader profile for context
        const profiles = await base44.entities.TraderProfile.list();
        const profile = profiles.length > 0 ? profiles[0] : null;

        let prompt = '';
        let contextData = {};

        if (analysisType === 'performance_by_strategy') {
            // Group trades by strategy
            const byStrategy = {};
            trades.forEach(t => {
                const key = t.strategy || 'Unspecified';
                if (!byStrategy[key]) byStrategy[key] = [];
                byStrategy[key].push(t);
            });

            contextData = { byStrategy, totalTrades: trades.length };

            prompt = `Analyze this trader's performance across different strategies:

Trader Profile: ${profile ? `${profile.trader_type}, ${profile.experience_level}` : 'Unknown'}

Strategy Breakdown:
${Object.entries(byStrategy).map(([strategy, stratTrades]) => {
    const wins = stratTrades.filter(t => t.pnl > 0).length;
    const losses = stratTrades.filter(t => t.pnl <= 0).length;
    const totalPnL = stratTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const avgPnL = totalPnL / stratTrades.length;
    const winRate = (wins / stratTrades.length * 100).toFixed(1);
    
    return `- ${strategy}: ${stratTrades.length} trades, ${winRate}% win rate, $${totalPnL.toFixed(2)} total P&L, $${avgPnL.toFixed(2)} avg per trade`;
}).join('\n')}

Provide:
1. Which strategies are performing best and why
2. Which strategies need improvement or should be avoided
3. Specific actionable recommendations for each strategy
4. Pattern recognition across winning vs losing trades
5. Suggested focus areas for the next trading period`;

        } else if (analysisType === 'emotion_correlation') {
            const emotionData = trades.filter(t => t.emotion_before || t.emotion_during || t.emotion_after);
            
            contextData = { emotionData: emotionData.length, totalTrades: trades.length };

            const emotionStats = {};
            emotionData.forEach(t => {
                const emotion = t.emotion_before || 'Unknown';
                if (!emotionStats[emotion]) {
                    emotionStats[emotion] = { trades: [], wins: 0, totalPnL: 0 };
                }
                emotionStats[emotion].trades.push(t);
                if (t.pnl > 0) emotionStats[emotion].wins++;
                emotionStats[emotion].totalPnL += t.pnl || 0;
            });

            prompt = `Analyze the correlation between emotional states and trading performance:

Total trades with emotion data: ${emotionData.length}

Emotion Breakdown:
${Object.entries(emotionStats).map(([emotion, data]) => {
    const winRate = (data.wins / data.trades.length * 100).toFixed(1);
    const avgPnL = (data.totalPnL / data.trades.length).toFixed(2);
    return `- ${emotion}: ${data.trades.length} trades, ${winRate}% win rate, $${avgPnL} avg P&L`;
}).join('\n')}

Provide:
1. Which emotional states lead to best trading performance
2. Which emotions correlate with poor decisions
3. Specific techniques to cultivate beneficial emotional states
4. Warning signs to watch for before entering trades`;

        } else if (analysisType === 'risk_management') {
            const tradesWithRisk = trades.filter(t => t.entry_price && t.stop_loss);
            const avgRiskReward = tradesWithRisk.reduce((sum, t) => sum + (t.risk_reward_ratio || 0), 0) / tradesWithRisk.length;
            
            const recentSnapshots = snapshots.slice(-30);
            const maxDrawdown = Math.max(...recentSnapshots.map(s => s.drawdown_daily_percent || 0));
            const avgDrawdown = recentSnapshots.reduce((sum, s) => sum + (s.drawdown_daily_percent || 0), 0) / recentSnapshots.length;

            contextData = { avgRiskReward, maxDrawdown, avgDrawdown };

            prompt = `Analyze this trader's risk management and provide recommendations:

Risk Metrics:
- Average R:R Ratio: ${avgRiskReward.toFixed(2)}
- Max Daily Drawdown: ${maxDrawdown.toFixed(2)}%
- Average Drawdown: ${avgDrawdown.toFixed(2)}%
- Trades with defined stop loss: ${tradesWithRisk.length}/${trades.length}

Account Stats:
${recentSnapshots.slice(-5).map(s => 
    `- ${new Date(s.timestamp).toLocaleDateString()}: Balance $${s.balance?.toFixed(2)}, Equity $${s.equity?.toFixed(2)}, Drawdown ${s.drawdown_daily_percent?.toFixed(2)}%`
).join('\n')}

Provide:
1. Assessment of current risk management discipline
2. Specific improvements to position sizing
3. Stop loss placement analysis
4. Recommendations for drawdown recovery
5. Risk mitigation strategies based on their trading style`;

        } else if (analysisType === 'weekly_summary') {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const weekTrades = trades.filter(t => new Date(t.entry_date) >= weekAgo);

            const wins = weekTrades.filter(t => t.pnl > 0).length;
            const losses = weekTrades.filter(t => t.pnl <= 0).length;
            const totalPnL = weekTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
            const winRate = weekTrades.length > 0 ? (wins / weekTrades.length * 100).toFixed(1) : 0;

            const byDay = {};
            weekTrades.forEach(t => {
                const day = new Date(t.entry_date).toLocaleDateString('en-US', { weekday: 'long' });
                if (!byDay[day]) byDay[day] = [];
                byDay[day].push(t);
            });

            contextData = { weekTrades: weekTrades.length, wins, losses, totalPnL, winRate };

            prompt = `Generate a comprehensive weekly trading summary:

Week Overview:
- Total Trades: ${weekTrades.length}
- Wins: ${wins}, Losses: ${losses}
- Win Rate: ${winRate}%
- Total P&L: $${totalPnL.toFixed(2)}
- Average P&L per trade: $${weekTrades.length > 0 ? (totalPnL / weekTrades.length).toFixed(2) : 0}

Daily Breakdown:
${Object.entries(byDay).map(([day, dayTrades]) => {
    const dayPnL = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    return `- ${day}: ${dayTrades.length} trades, $${dayPnL.toFixed(2)}`;
}).join('\n')}

Top 3 Winning Trades:
${weekTrades.sort((a, b) => b.pnl - a.pnl).slice(0, 3).map(t => 
    `- ${t.symbol} ${t.side}: $${t.pnl.toFixed(2)} (${t.strategy || 'No strategy'})`
).join('\n')}

Top 3 Losing Trades:
${weekTrades.sort((a, b) => a.pnl - b.pnl).slice(0, 3).map(t => 
    `- ${t.symbol} ${t.side}: $${t.pnl.toFixed(2)} (${t.strategy || 'No strategy'})`
).join('\n')}

Provide:
1. Key strengths demonstrated this week
2. Main weaknesses or mistakes
3. Patterns of success (time of day, setups, conditions)
4. Patterns of failure to avoid
5. Specific action items for next week
6. Motivational insight based on progress`;
        }

        // Call AI for analysis
        const aiResponse = await base44.integrations.Core.InvokeLLM({
            prompt: prompt,
            add_context_from_internet: false
        });

        return Response.json({
            status: 'success',
            analysis: aiResponse,
            contextData
        });

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});