import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const WEBHOOK_TOKEN = 'hj_update_9x2k_signals_2026';

/**
 * Update signal status.
 * Two modes:
 *  1. Webhook mode: POST { signal_id, status, token } — authenticated by static token, no user session needed.
 *  2. Session mode: POST { signal_id, status } — authenticated by user session (existing behavior).
 */
Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { signal_id, status, token, resolved_at } = body;

    // --- Webhook / token-based mode ---
    if (token !== undefined) {
      if (token !== WEBHOOK_TOKEN) {
        return Response.json({ error: 'Invalid token' }, { status: 401 });
      }

      if (!signal_id) {
        return Response.json({ error: 'signal_id is required' }, { status: 400 });
      }

      if (!status) {
        return Response.json({ error: 'status is required' }, { status: 400 });
      }

      const base44 = createClientFromRequest(req);

      const signals = await base44.asServiceRole.entities.Signal.filter({ id: signal_id });
      if (!signals || signals.length === 0) {
        return Response.json({ error: 'Signal not found' }, { status: 404 });
      }

      const updateData = { status };
      if (status === 'executed') {
        updateData.executed_at = new Date().toISOString();
      }
      if (resolved_at) {
        updateData.resolved_at = resolved_at;
      } else if (['tp1_hit', 'tp2_hit', 'full_target', 'stopped_out'].includes(status)) {
        updateData.resolved_at = new Date().toISOString();
      }

      await base44.asServiceRole.entities.Signal.update(signal_id, updateData);

      console.log(`[webhook] Signal ${signal_id} updated to status: ${status}`);

      return Response.json({ success: true, signal_id, status });
    }

    // --- Session-based mode (existing behavior) ---
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!signal_id) {
      return Response.json({ error: 'signal_id is required' }, { status: 400 });
    }

    const validStatuses = ['viewed', 'ignored', 'executed', 'tp1_hit', 'tp2_hit', 'full_target', 'stopped_out'];
    if (!validStatuses.includes(status)) {
      return Response.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const signals = await base44.asServiceRole.entities.Signal.filter({ id: signal_id });
    const signal = signals[0];

    if (!signal) {
      return Response.json({ error: 'Signal not found' }, { status: 404 });
    }

    if (signal.user_email !== user.email) {
      return Response.json({ error: 'Unauthorized - signal does not belong to this user' }, { status: 403 });
    }

    const updateData = { status };
    if (status === 'executed') {
      updateData.executed_at = new Date().toISOString();
    }
    if (resolved_at) {
      updateData.resolved_at = resolved_at;
    } else if (['tp1_hit', 'tp2_hit', 'full_target', 'stopped_out'].includes(status)) {
      updateData.resolved_at = new Date().toISOString();
    }

    const updatedSignal = await base44.asServiceRole.entities.Signal.update(signal_id, updateData);

    console.log(`Signal ${signal_id} updated to status: ${status} by user: ${user.email}`);

    return Response.json({
      success: true,
      signal: updatedSignal,
      message: `Signal marked as ${status}`
    });

  } catch (error) {
    console.error('Update signal status error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});