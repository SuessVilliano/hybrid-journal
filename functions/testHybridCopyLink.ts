import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Test function to verify Hybrid Copy integration
 * 
 * This helps debug the app linking flow:
 * 1. Check if user has webhook token
 * 2. Check if link token was generated
 * 3. Check if ConnectedApp was created
 * 4. Verify HMAC setup
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check webhook token
    const webhookToken = user.webhook_token;
    const webhookEnabled = user.webhook_enabled;

    // Check active link tokens
    const linkTokens = await base44.asServiceRole.entities.AppLinkToken.filter({
      user_id: user.id
    });

    // Check connected apps
    const connectedApps = await base44.asServiceRole.entities.ConnectedApp.filter({
      user_email: user.email,
      status: 'active'
    });

    // Check recent sync events from Hybrid Copy
    const recentSyncEvents = await base44.entities.SyncEventLog.filter({
      user_email: user.email,
      source: 'iCopyTrade'
    });

    // Get recent signals
    const recentSignals = await base44.entities.Signal.list('-created_date', 10);

    const diagnostics = {
      user: {
        email: user.email,
        id: user.id,
        webhook_token: webhookToken ? `${webhookToken.substring(0, 10)}...` : 'NOT SET',
        webhook_enabled: webhookEnabled
      },
      webhook: {
        url: webhookToken 
          ? `https://hybridjournal.co/api/functions/ingestSignal?token=${webhookToken}`
          : 'Webhook not enabled - enable in My Profile',
        status: webhookEnabled ? '✅ ENABLED' : '❌ DISABLED'
      },
      linking: {
        active_link_tokens: linkTokens.filter(t => !t.used_at && new Date(t.expires_at) > new Date()).length,
        used_link_tokens: linkTokens.filter(t => t.used_at).length,
        total_link_tokens: linkTokens.length,
        most_recent_token: linkTokens[0] ? {
          token: `${linkTokens[0].token.substring(0, 20)}...`,
          expires_at: linkTokens[0].expires_at,
          used_at: linkTokens[0].used_at,
          is_expired: new Date(linkTokens[0].expires_at) < new Date()
        } : null
      },
      connected_apps: {
        total: connectedApps.length,
        apps: connectedApps.map(app => ({
          app_name: app.app_name,
          status: app.status,
          total_events: app.total_events_received,
          last_event: app.last_event_at,
          has_secret: !!app.signing_secret_ref
        }))
      },
      sync_history: {
        total_events: recentSyncEvents.length,
        recent: recentSyncEvents.slice(0, 5).map(log => ({
          event_type: log.event_type,
          status: log.status,
          created_date: log.created_date,
          trades_created: log.trades_created,
          error: log.error_message
        }))
      },
      signals: {
        total: recentSignals.length,
        recent: recentSignals.slice(0, 3).map(s => ({
          symbol: s.symbol,
          action: s.action,
          provider: s.provider,
          status: s.status,
          created: s.created_date
        }))
      },
      integration_status: {
        webhook_ready: !!webhookToken && webhookEnabled,
        app_linking_ready: connectedApps.length > 0,
        receiving_events: recentSyncEvents.filter(e => 
          new Date(e.created_date) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length > 0,
        overall: connectedApps.length > 0 && webhookToken && webhookEnabled 
          ? '✅ FULLY INTEGRATED' 
          : '⚠️ SETUP INCOMPLETE'
      },
      next_steps: getNextSteps(webhookToken, webhookEnabled, connectedApps, linkTokens)
    };

    return Response.json(diagnostics);

  } catch (error) {
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

function getNextSteps(webhookToken, webhookEnabled, connectedApps, linkTokens) {
  const steps = [];

  if (!webhookToken || !webhookEnabled) {
    steps.push('1. Enable webhook in My Profile → Webhook Settings → Generate Token');
  }

  if (connectedApps.length === 0) {
    const hasUnusedToken = linkTokens.some(t => !t.used_at && new Date(t.expires_at) > new Date());
    
    if (!hasUnusedToken) {
      steps.push('2. Generate link token in Accounts → App Linking tab');
      steps.push('3. Copy the token and paste it in Hybrid Copy → Journal Sync → Connect Journal');
    } else {
      steps.push('2. Use your active link token in Hybrid Copy → Journal Sync → Connect Journal');
    }
  }

  if (steps.length === 0) {
    steps.push('✅ All set! Your Hybrid Journal is connected to Hybrid Copy.');
    steps.push('Trades from Hybrid Copy will appear in your journal automatically.');
  }

  return steps;
}