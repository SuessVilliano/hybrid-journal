import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data: signal } = await req.json();

    if (event.type !== 'create' || !signal) {
      return Response.json({ message: 'Not a create event' }, { status: 200 });
    }

    // Get all users and their notification preferences
    const users = await base44.asServiceRole.entities.User.list();

    for (const user of users) {
      const prefs = user.notification_preferences || {};
      
      // Skip if notifications disabled for this user
      if (prefs.enabled === false) continue;

      // Apply filters
      if (prefs.symbols?.length > 0 && !prefs.symbols.includes(signal.symbol)) continue;
      if (prefs.actions?.length > 0 && !prefs.actions.includes(signal.action)) continue;
      if (prefs.providers?.length > 0 && !prefs.providers.includes(signal.provider)) continue;
      if (prefs.min_confidence > 0 && (signal.confidence || 0) < prefs.min_confidence) continue;

      // Create notification for this user
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: user.email,
        type: 'trade_alert',
        title: `New Signal: ${signal.action} ${signal.symbol}`,
        message: `${signal.provider} | Entry: ${signal.price || 'Market'} | SL: ${signal.stop_loss || 'N/A'} | TP: ${signal.take_profit || signal.take_profits?.[0] || 'N/A'}${signal.confidence ? ` | Confidence: ${signal.confidence}%` : ''}`,
        link: `/LiveTradingSignals?signal=${signal.id}`,
        priority: signal.confidence >= 80 ? 'high' : 'medium'
      });
    }

    return Response.json({ message: 'Notifications created', count: users.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});