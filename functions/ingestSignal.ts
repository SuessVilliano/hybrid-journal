import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse webhook payload
    const payload = await req.json();
    
    // Extract signal data (supports TradingView format and generic format)
    const signalData = {
      provider: payload.provider || 'TradingView',
      symbol: payload.ticker || payload.symbol || '',
      action: (payload.action || payload.strategy?.order_action || '').toUpperCase(),
      price: parseFloat(payload.close || payload.price || 0),
      stop_loss: parseFloat(payload.stop_loss || payload.sl || 0),
      take_profit: parseFloat(payload.take_profit || payload.tp || 0),
      timeframe: payload.interval || payload.timeframe || '',
      confidence: parseFloat(payload.confidence || 85),
      strategy: payload.strategy?.order_comment || payload.strategy_name || '',
      notes: payload.message || payload.notes || '',
      status: 'new',
      raw_data: payload
    };

    // Validate required fields
    if (!signalData.symbol || !signalData.action) {
      return Response.json({ 
        error: 'Missing required fields: symbol and action are required',
        received: payload
      }, { status: 400 });
    }

    // Create signal record
    const signal = await base44.entities.Signal.create(signalData);

    // Check if signal violates prop firm rules
    const propFirmSettings = await base44.entities.PropFirmSettings.filter({ is_active: true });
    let riskWarning = null;
    
    if (propFirmSettings.length > 0) {
      const settings = propFirmSettings[0];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayTrades = await base44.entities.Trade.filter({
        created_by: user.email,
        entry_date: { $gte: todayStart.toISOString() }
      });
      
      const todayPnl = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const maxDailyLossDollars = settings.account_size * (settings.max_daily_loss_percent / 100);
      
      if (todayPnl < 0 && Math.abs(todayPnl) >= maxDailyLossDollars * 0.8) {
        riskWarning = `⚠️ WARNING: You're at ${Math.abs(todayPnl).toFixed(2)}/${maxDailyLossDollars.toFixed(2)} of your daily loss limit (${settings.max_daily_loss_percent}%)`;
      }
    }

    return Response.json({ 
      success: true,
      signal: signal,
      message: 'Signal received successfully',
      riskWarning: riskWarning
    });

  } catch (error) {
    console.error('Signal ingestion error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});