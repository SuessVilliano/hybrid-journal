import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, eventData, planIds, sessionIds } = body;

    // Get Google Calendar access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlecalendar');
    if (!accessToken) {
      return Response.json({ error: 'Google Calendar not connected.' }, { status: 400 });
    }

    const calendarHeaders = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // ── CREATE SINGLE EVENT ──────────────────────────────────────────────
    if (action === 'createEvent') {
      const startTime = eventData.startTime.includes('T')
        ? eventData.startTime
        : new Date(eventData.startTime).toISOString();
      const endTime = eventData.endTime.includes('T')
        ? eventData.endTime
        : new Date(eventData.endTime).toISOString();

      const event = {
        summary: eventData.title || 'Trading Session',
        description: eventData.description || '',
        start: { dateTime: startTime, timeZone: 'America/New_York' },
        end: { dateTime: endTime, timeZone: 'America/New_York' },
        colorId: eventData.colorId || '1',
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 15 }]
        }
      };

      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        { method: 'POST', headers: calendarHeaders, body: JSON.stringify(event) }
      );

      if (!res.ok) {
        const err = await res.text();
        return Response.json({ error: 'Failed to create event: ' + err }, { status: 500 });
      }

      const created = await res.json();
      return Response.json({ success: true, event: created, message: 'Event added to your Google Calendar!' });
    }

    // ── BULK SYNC DAILY PLANS ────────────────────────────────────────────
    if (action === 'syncDailyPlans') {
      const plans = await base44.entities.DailyTradePlan.filter({ created_by: user.email }, '-date', 30);
      const results = { created: 0, failed: 0, skipped: 0 };

      for (const plan of plans) {
        if (!plan.date) { results.skipped++; continue; }

        // Build a full-day event for the plan date
        const description = [
          plan.plan_text ? `📋 Plan: ${plan.plan_text.slice(0, 500)}` : '',
          plan.markets_to_watch?.length ? `👀 Watch: ${plan.markets_to_watch.join(', ')}` : '',
          plan.max_risk ? `⚠️ Max Risk: $${plan.max_risk}` : '',
          plan.max_trades ? `🎯 Max Trades: ${plan.max_trades}` : '',
          plan.trading_rules?.length ? `📏 Rules:\n${plan.trading_rules.join('\n')}` : '',
          plan.ai_summary ? `🤖 AI Summary: ${plan.ai_summary.slice(0, 300)}` : ''
        ].filter(Boolean).join('\n\n');

        const event = {
          summary: `📊 Trading Plan — ${plan.date}`,
          description,
          start: { date: plan.date },
          end: { date: plan.date },
          colorId: '7', // teal/cyan
          reminders: {
            useDefault: false,
            overrides: [{ method: 'popup', minutes: 30 }]
          }
        };

        const res = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          { method: 'POST', headers: calendarHeaders, body: JSON.stringify(event) }
        );

        if (res.ok) { results.created++; } else { results.failed++; }
      }

      return Response.json({
        success: true,
        message: `Synced ${results.created} daily plans to Google Calendar`,
        results
      });
    }

    // ── SYNC TRADING SESSIONS ────────────────────────────────────────────
    if (action === 'syncTradingSessions') {
      const sessions = await base44.entities.TradingSession.filter({ created_by: user.email }, '-start_time', 30);
      const results = { created: 0, failed: 0, skipped: 0 };

      for (const session of sessions) {
        if (!session.start_time) { results.skipped++; continue; }

        const startTime = new Date(session.start_time).toISOString();
        const endTime = session.end_time
          ? new Date(session.end_time).toISOString()
          : new Date(new Date(session.start_time).getTime() + 4 * 60 * 60 * 1000).toISOString();

        const pnlText = session.total_pnl != null
          ? `\n💰 P&L: ${session.total_pnl >= 0 ? '+' : ''}$${Number(session.total_pnl).toFixed(2)}`
          : '';

        const description = [
          session.notes ? `📝 ${session.notes}` : '',
          session.market_session ? `⏰ Session: ${session.market_session}` : '',
          `🔢 Trades: ${session.trades_count || 0}`,
          pnlText
        ].filter(Boolean).join('\n');

        // Color by P&L: green if profitable, red if loss, blue if neutral
        const colorId = session.total_pnl > 0 ? '10' : session.total_pnl < 0 ? '11' : '9';

        const event = {
          summary: `📈 Trading Session${session.market_session ? ` — ${session.market_session}` : ''}`,
          description,
          start: { dateTime: startTime, timeZone: 'America/New_York' },
          end: { dateTime: endTime, timeZone: 'America/New_York' },
          colorId,
          reminders: { useDefault: false, overrides: [] }
        };

        const res = await fetch(
          'https://www.googleapis.com/calendar/v3/calendars/primary/events',
          { method: 'POST', headers: calendarHeaders, body: JSON.stringify(event) }
        );

        if (res.ok) { results.created++; } else { results.failed++; }
      }

      return Response.json({
        success: true,
        message: `Synced ${results.created} trading sessions to Google Calendar`,
        results
      });
    }

    // ── LIST UPCOMING EVENTS ─────────────────────────────────────────────
    if (action === 'listEvents') {
      const timeMin = new Date().toISOString();
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=50`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!res.ok) return Response.json({ error: 'Failed to fetch events' }, { status: 500 });
      const data = await res.json();
      return Response.json({ success: true, events: data.items || [] });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Calendar sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});