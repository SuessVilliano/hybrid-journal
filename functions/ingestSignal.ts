import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Extract webhook token from query params
    const url = new URL(req.url);
    const token = url.searchParams.get('token');
    
    if (!token) {
      return Response.json({ 
        error: 'Missing webhook token. URL format: /api/functions/ingestSignal?token=YOUR_TOKEN',
        hint: 'Find your webhook token in My Profile page'
      }, { status: 401 });
    }
    
    // Find user by webhook token
    const users = await base44.asServiceRole.entities.User.filter({ webhook_token: token });
    
    if (!users || users.length === 0) {
      return Response.json({ 
        error: 'Invalid webhook token',
        hint: 'Generate a new token in My Profile page'
      }, { status: 401 });
    }
    
    const user = users[0];
    
    if (!user.webhook_enabled) {
      return Response.json({ 
        error: 'Webhook ingestion is disabled for this user',
        hint: 'Enable webhooks in My Profile page'
      }, { status: 403 });
    }

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

    // Add user_email to signal data (RLS filters on this field)
    signalData.user_email = user.email;

    // Enhanced logging for debugging
    console.log('🔍 WEBHOOK DEBUG:', {
      webhook_token: token,
      user_found: user.email,
      user_webhook_enabled: user.webhook_enabled,
      signal_symbol: signalData.symbol,
      signal_action: signalData.action,
      signal_user_email: signalData.user_email,
      timestamp: new Date().toISOString()
    });

    // Create signal record using service role
    const signal = await base44.asServiceRole.entities.Signal.create(signalData);

    // Verify signal was created with correct user_email
    console.log('✅ SIGNAL CREATED:', {
      signal_id: signal.id,
      signal_user_email: signal.user_email,
      created_by: signal.created_by,
      matches_user: signal.user_email === user.email
    });

    // Check notification preferences
    const prefs = user.notification_preferences || { enabled: true };
    let shouldNotify = prefs.enabled !== false;

    if (shouldNotify) {
      // Filter by symbols
      if (prefs.symbols && prefs.symbols.length > 0) {
        shouldNotify = prefs.symbols.includes(signalData.symbol);
      }
      // Filter by actions
      if (shouldNotify && prefs.actions && prefs.actions.length > 0) {
        shouldNotify = prefs.actions.includes(signalData.action);
      }
      // Filter by confidence
      if (shouldNotify && prefs.min_confidence) {
        shouldNotify = signalData.confidence >= prefs.min_confidence;
      }
      // Filter by providers
      if (shouldNotify && prefs.providers && prefs.providers.length > 0) {
        shouldNotify = prefs.providers.includes(signalData.provider);
      }
    }

    // Create notification if passes filters
    if (shouldNotify) {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: user.email,
        type: 'trade_alert',
        title: `New Trading Signal: ${signalData.symbol}`,
        message: `${signalData.action} signal received for ${signalData.symbol} at ${signalData.price}`,
        link: '/LiveTradingSignals',
        priority: 'high',
        user_email: user.email
      });
    }

    // Log the webhook request
    await base44.asServiceRole.entities.SyncLog.create({
      sync_type: 'webhook_signal',
      status: 'success',
      records_synced: 1,
      details: `Signal received: ${signalData.symbol} ${signalData.action} @ ${signalData.price}`,
      user_email: user.email
    });

    return Response.json({ 
      success: true,
      signal: signal,
      message: 'Signal received successfully',
      user: user.email
    });

  } catch (error) {
    console.error('Signal ingestion error:', error);
    
    // Try to log the error if we can determine the user
    try {
      const url = new URL(req.url);
      const token = url.searchParams.get('token');
      if (token) {
        const base44 = createClientFromRequest(req);
        const users = await base44.asServiceRole.entities.User.filter({ webhook_token: token });
        if (users && users.length > 0) {
          const user = users[0];
          await base44.asServiceRole.entities.SyncLog.create({
            sync_type: 'webhook_signal',
            status: 'failed',
            records_synced: 0,
            error_message: error.message,
            details: error.stack,
            user_email: user.email
          });
        }
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
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