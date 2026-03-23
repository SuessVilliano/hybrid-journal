import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { signal_id } = await req.json();
    
    if (!signal_id) {
      return Response.json({ error: 'signal_id is required' }, { status: 400 });
    }

    // Get the signal
    const signal = await base44.asServiceRole.entities.Signal.filter({ id: signal_id });
    if (!signal || signal.length === 0) {
      return Response.json({ error: 'Signal not found' }, { status: 404 });
    }
    
    const signalData = signal[0];
    const userEmail = signalData.user_email;

    // Get all enabled routing rules for this user, sorted by priority
    const rules = await base44.asServiceRole.entities.SignalRoutingRule.filter(
      { created_by: userEmail, enabled: true },
      '-priority'
    );

    const matchedRules = [];
    const executedActions = [];

    // Process each rule
    for (const rule of rules) {
      // Check if signal matches conditions
      const conditions = rule.conditions || {};
      let matches = true;

      // Check symbols
      if (conditions.symbols && conditions.symbols.length > 0) {
        if (!conditions.symbols.includes(signalData.symbol)) {
          matches = false;
        }
      }

      // Check actions
      if (conditions.actions && conditions.actions.length > 0) {
        if (!conditions.actions.includes(signalData.action)) {
          matches = false;
        }
      }

      // Check providers
      if (conditions.providers && conditions.providers.length > 0) {
        if (!conditions.providers.includes(signalData.provider)) {
          matches = false;
        }
      }

      // Check confidence
      if (conditions.min_confidence && signalData.confidence < conditions.min_confidence) {
        matches = false;
      }
      if (conditions.max_confidence && signalData.confidence > conditions.max_confidence) {
        matches = false;
      }

      if (!matches) continue;

      matchedRules.push(rule.name);

      // Execute actions
      for (const action of rule.actions || []) {
        try {
          const result = await executeAction(action, signalData, userEmail, base44);
          executedActions.push({
            rule: rule.name,
            action: action.type,
            result: result,
            success: true
          });
        } catch (error) {
          executedActions.push({
            rule: rule.name,
            action: action.type,
            error: error.message,
            success: false
          });
        }
      }

      // Stop if this rule says to stop after match
      if (rule.stop_after_match) {
        break;
      }
    }

    return Response.json({
      success: true,
      signal_id: signal_id,
      matched_rules: matchedRules,
      executed_actions: executedActions
    });

  } catch (error) {
    console.error('Signal routing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function executeAction(action, signalData, userEmail, base44) {
  const config = action.config || {};

  // Replace placeholders in config
  const replacePlaceholders = (text) => {
    if (!text) return text;
    return text
      .replace(/\{\{symbol\}\}/g, signalData.symbol)
      .replace(/\{\{action\}\}/g, signalData.action)
      .replace(/\{\{price\}\}/g, signalData.price)
      .replace(/\{\{provider\}\}/g, signalData.provider)
      .replace(/\{\{confidence\}\}/g, signalData.confidence);
  };

  switch (action.type) {
    case 'send_notification':
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: userEmail,
        type: 'trade_alert',
        title: replacePlaceholders(config.title) || 'Signal Routing Alert',
        message: replacePlaceholders(config.message) || `Signal received: ${signalData.symbol} ${signalData.action}`,
        link: '/LiveTradingSignals',
        priority: config.priority || 'medium',
        user_email: userEmail
      });
      return { notification_sent: true };

    case 'create_journal_entry':
      await base44.asServiceRole.entities.JournalEntry.create({
        date: new Date().toISOString(),
        content: replacePlaceholders(config.content) || `Auto-generated from signal: ${signalData.symbol} ${signalData.action} at ${signalData.price}`,
        entry_type: 'observation',
        created_by: userEmail
      });
      return { journal_entry_created: true };

    case 'webhook':
      const webhookResponse = await fetch(config.url, {
        method: config.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signalData)
      });
      return { 
        webhook_called: true, 
        status: webhookResponse.status,
        response: await webhookResponse.text()
      };

    case 'api_call':
      const headers = { 'Content-Type': 'application/json' };
      if (config.api_key) {
        headers['Authorization'] = `Bearer ${config.api_key}`;
      }
      const apiResponse = await fetch(config.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(signalData)
      });
      return { 
        api_called: true, 
        status: apiResponse.status,
        response: await apiResponse.json()
      };

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}