import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Intelligent Trade Routing System
 * 
 * This function acts as the central routing engine that:
 * 1. Receives a signal/trade request
 * 2. Applies AI-driven validation and approval logic
 * 3. Routes to appropriate execution endpoint (Copygram, other bridges, or direct broker APIs)
 * 4. Logs all routing decisions and outcomes
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { signal_id, execution_target, override_approval } = payload;

    if (!signal_id) {
      return Response.json({ error: 'signal_id is required' }, { status: 400 });
    }

    // Fetch the signal
    const signals = await base44.asServiceRole.entities.Signal.filter({ id: signal_id });
    const signal = signals[0];

    if (!signal) {
      return Response.json({ error: 'Signal not found' }, { status: 404 });
    }

    // Fetch user's prop firm settings for risk validation
    const propSettings = await base44.entities.PropFirmSettings.filter({ 
      created_by: user.email,
      is_active: true 
    });
    const activePropFirm = propSettings[0];

    // Fetch today's trades to calculate current P&L
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysTrades = await base44.entities.Trade.filter({
      created_by: user.email,
      entry_date: { $gte: today.toISOString() }
    });
    const todaysPnL = todaysTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    // AI-driven approval logic
    let approved = false;
    let approval_reason = '';
    let risk_warnings = [];

    if (override_approval) {
      approved = true;
      approval_reason = 'Manual override by user';
    } else {
      // Check prop firm rules
      if (activePropFirm) {
        const maxDailyLoss = activePropFirm.max_daily_loss_dollars || 
          (activePropFirm.account_size * (activePropFirm.max_daily_loss_percent / 100));
        
        if (todaysPnL < -maxDailyLoss) {
          approved = false;
          approval_reason = 'Daily loss limit exceeded';
          risk_warnings.push(`Daily loss limit of $${maxDailyLoss.toFixed(2)} exceeded. Current P&L: $${todaysPnL.toFixed(2)}`);
        } else if (todaysPnL < -(maxDailyLoss * 0.8)) {
          risk_warnings.push(`Warning: 80% of daily loss limit reached. Current P&L: $${todaysPnL.toFixed(2)}`);
        }
      }

      // Use AI for advanced signal validation
      const aiValidation = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this trading signal and decide if it should be executed:

Signal Details:
- Symbol: ${signal.symbol}
- Action: ${signal.action}
- Price: ${signal.price}
- Stop Loss: ${signal.stop_loss}
- Take Profit: ${signal.take_profit}
- Strategy: ${signal.strategy || 'Unknown'}
- Provider: ${signal.provider}

Current Context:
- Today's P&L: $${todaysPnL.toFixed(2)}
- Prop Firm: ${activePropFirm?.firm_name || 'None'}
- Max Daily Loss: $${activePropFirm?.max_daily_loss_dollars || 0}
- Recent Trades: ${todaysTrades.length}

Provide a JSON response with:
{
  "approved": true/false,
  "confidence": 0-100,
  "reasoning": "explanation",
  "risk_score": 0-100,
  "suggestions": ["suggestion1", "suggestion2"]
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            approved: { type: 'boolean' },
            confidence: { type: 'number' },
            reasoning: { type: 'string' },
            risk_score: { type: 'number' },
            suggestions: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      if (approved !== false) { // If not already rejected by prop firm rules
        approved = aiValidation.approved;
        approval_reason = aiValidation.reasoning;
        
        if (aiValidation.risk_score > 70) {
          risk_warnings.push(`High risk score: ${aiValidation.risk_score}/100`);
        }
        
        risk_warnings.push(...(aiValidation.suggestions || []));
      }
    }

    // Determine execution target
    const target = execution_target || 'copygram'; // Default to Copygram
    let routing_log = {
      signal_id,
      approved,
      approval_reason,
      risk_warnings,
      target,
      timestamp: new Date().toISOString(),
      user_email: user.email
    };

    let execution_result = null;

    if (approved) {
      // Route to appropriate execution endpoint
      switch (target) {
        case 'copygram':
          execution_result = await routeToCopygram(signal, base44);
          break;
        case 'direct_broker':
          // Future: Route to direct broker API
          execution_result = { error: 'Direct broker routing not yet implemented' };
          break;
        case 'custom_bridge':
          // Future: Route to custom execution bridge
          execution_result = { error: 'Custom bridge routing not yet implemented' };
          break;
        default:
          execution_result = { error: 'Unknown execution target' };
      }

      routing_log.execution_result = execution_result;
      routing_log.execution_status = execution_result.success ? 'success' : 'failed';
    } else {
      routing_log.execution_status = 'rejected';
    }

    // Log the routing decision (create a new entity for this later if needed)
    console.log('Trade Routing Decision:', JSON.stringify(routing_log, null, 2));

    // Update signal status
    if (approved && execution_result?.success) {
      await base44.asServiceRole.entities.Signal.update(signal_id, {
        status: 'executed',
        executed_at: new Date().toISOString()
      });
    }

    return Response.json({
      success: approved && execution_result?.success,
      approved,
      approval_reason,
      risk_warnings,
      routing_log,
      execution_result
    });

  } catch (error) {
    console.error('Trade routing error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});

/**
 * Route trade to Copygram webhook
 */
async function routeToCopygram(signal, base44) {
  try {
    // Copygram webhook URL (should be stored in environment or settings)
    const copgramWebhook = Deno.env.get('COPYGRAM_WEBHOOK_URL') || 
      'https://apiv2.copygram.app/tradingview/KOO8IL55GQQI';

    // Format payload for Copygram (TradingView format)
    const payload = {
      ticker: signal.symbol,
      action: signal.action,
      price: signal.price,
      stop_loss: signal.stop_loss || 0,
      take_profit: signal.take_profit || 0,
      strategy: signal.strategy || 'Base44_Signal',
      timeframe: signal.timeframe || '15m',
      timestamp: new Date().toISOString()
    };

    const response = await fetch(copgramWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.text();

    return {
      success: response.ok,
      status: response.status,
      response: result,
      target: 'copygram',
      payload_sent: payload
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      target: 'copygram'
    };
  }
}