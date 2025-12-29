import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse webhook payload
    let payload = await req.json();
    
    // If payload has a "body" or "rawBody" field (text-based signal), parse it
    if (payload.body || payload.rawBody) {
      payload = parseTextSignal(payload.body || payload.rawBody, payload);
    }
    
    // Extract signal data (supports TradingView format and generic format)
    const signalData = {
      provider: payload.provider || 'TradingView',
      symbol: payload.ticker || payload.symbol || '',
      action: (payload.action || payload.strategy?.order_action || '').toUpperCase(),
      price: parseFloat(payload.close || payload.price || payload.entry || 0),
      stop_loss: parseFloat(payload.stop_loss || payload.sl || 0),
      take_profit: parseFloat(payload.take_profit || payload.tp || payload.tp1 || 0),
      take_profits: payload.take_profits || [],
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

/**
 * Parse text-based signal formats (Telegram, Taskmagic, etc.)
 */
function parseTextSignal(text, originalPayload) {
  const signal = { ...originalPayload };
  
  // Detect BUY or SELL
  if (/🟢|BUY|📈/i.test(text)) {
    signal.action = 'BUY';
  } else if (/🔴|SELL|📉/i.test(text)) {
    signal.action = 'SELL';
  }
  
  // Extract symbol
  const symbolMatch = text.match(/Symbol:?\s*([A-Z0-9!]+)/i) || 
                      text.match(/([A-Z]{3,}USD|NQ1?!?|ES1?!?|YM1?!?|MNQ|MES|BTCUSDT|NAS100USD)/);
  if (symbolMatch) {
    signal.symbol = symbolMatch[1].replace('!', '');
  }
  
  // Extract entry price
  const entryMatch = text.match(/Entry:?\s*=?\s*([\d,.]+)/i);
  if (entryMatch) {
    signal.entry = parseFloat(entryMatch[1].replace(',', ''));
  }
  
  // Extract stop loss
  const slMatch = text.match(/(?:Stop Loss|SL|🎯):?\s*=?\s*([\d,.]+)/i);
  if (slMatch) {
    signal.sl = parseFloat(slMatch[1].replace(',', ''));
  }
  
  // Extract multiple take profits
  const tpMatches = text.matchAll(/(?:TP|Take Profit|⛔|✅)\s*(\d+)?:?\s*=?\s*([\d,.]+)/gi);
  const takeProfits = [];
  for (const match of tpMatches) {
    takeProfits.push(parseFloat(match[2].replace(',', '')));
  }
  if (takeProfits.length > 0) {
    signal.take_profits = takeProfits;
    signal.tp1 = takeProfits[0];
  }
  
  // Detect provider from context
  if (!signal.provider || signal.provider === 'Unknown' || signal.provider === 'TradingView') {
    if (text.includes('Hybrid') || (text.includes('NQ1') && text.includes('DO NOT RISK'))) {
      signal.provider = 'Hybrid AI';
    } else if (text.includes('Paradox') || text.includes('BTCUSDT')) {
      signal.provider = 'Paradox';
    } else if (text.includes('Solaris') || text.includes('NAS100USD')) {
      signal.provider = 'Solaris';
    } else {
      signal.provider = 'Telegram';
    }
  }
  
  return signal;
}