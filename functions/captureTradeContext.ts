import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Capture Market Context for Trade Entry
 * 
 * Automatically captures current market regime and scores
 * when a trade is being entered, then updates the trade record
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { trade_id } = await req.json();

    if (!trade_id) {
      return Response.json({ error: 'trade_id required' }, { status: 400 });
    }

    // Get latest market snapshot
    const snapshots = await base44.entities.MarketSnapshot.list('-created_date', 1);
    
    if (snapshots.length === 0) {
      // No snapshot available, trigger a fresh calculation
      const causeResponse = await base44.functions.invoke('marketCauseEngine', { action: 'analyze' });
      const { scores } = causeResponse.data;
      
      // Update trade with market context
      await base44.entities.Trade.update(trade_id, {
        entry_regime: scores.regime,
        entry_cause_score: scores.composite,
        entry_macro_score: scores.macro,
        entry_positioning_score: scores.positioning,
        entry_catalyst_score: scores.catalyst,
        market_context: `Regime: ${scores.regime}, Score: ${scores.composite.toFixed(0)}`
      });

      return Response.json({
        success: true,
        context: {
          regime: scores.regime,
          cause_score: scores.composite
        }
      });
    }

    const snapshot = snapshots[0];

    // Update trade with market context from snapshot
    await base44.entities.Trade.update(trade_id, {
      entry_regime: snapshot.regime,
      entry_cause_score: snapshot.composite_score,
      entry_macro_score: snapshot.macro_score,
      entry_positioning_score: snapshot.positioning_score,
      entry_catalyst_score: snapshot.catalyst_score,
      market_context: `Regime: ${snapshot.regime}, Score: ${snapshot.composite_score.toFixed(0)}`
    });

    return Response.json({
      success: true,
      context: {
        regime: snapshot.regime,
        cause_score: snapshot.composite_score
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});