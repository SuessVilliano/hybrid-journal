import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const WEBHOOK_TOKEN = 'hj_update_9x2k_signals_2026';

/**
 * Returns all signals that the monitor should be watching:
 * - status: new (unresolved, need TP/SL check)
 * - status: tp1_hit (partial win, can escalate to tp2 or full_target)
 * - status: tp2_hit (partial win, can escalate to full_target)
 *
 * Auth: same static token used by signal_monitor.py
 * Usage: GET /api/functions/getActiveSignals?token=hj_update_9x2k_signals_2026
 */
Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token || token !== WEBHOOK_TOKEN) {
      return Response.json({ error: 'Invalid or missing token' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    // Fetch all three watchable statuses in parallel
    const [newSignals, tp1Signals, tp2Signals] = await Promise.all([
      base44.asServiceRole.entities.Signal.filter({ status: 'new' }, '-created_date', 500),
      base44.asServiceRole.entities.Signal.filter({ status: 'tp1_hit' }, '-created_date', 200),
      base44.asServiceRole.entities.Signal.filter({ status: 'tp2_hit' }, '-created_date', 200),
    ]);

    const signals = [...newSignals, ...tp1Signals, ...tp2Signals];

    console.log(`[getActiveSignals] Returning ${signals.length} signals (new: ${newSignals.length}, tp1_hit: ${tp1Signals.length}, tp2_hit: ${tp2Signals.length})`);

    return Response.json({
      success: true,
      count: signals.length,
      breakdown: {
        new: newSignals.length,
        tp1_hit: tp1Signals.length,
        tp2_hit: tp2Signals.length,
      },
      signals,
    });

  } catch (error) {
    console.error('getActiveSignals error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});