import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { mapSymbol, fetchPrice, checkSignalHit, sendHitNotifications } from '../../shared/signalMonitor.ts';

/**
 * Triggered the moment a new trading signal is created (entity "create" automation).
 * Does an immediate price check against TP/SL so a target that's already hit on
 * arrival is detected instantly — no waiting for the scheduled monitor.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { event, data: signal } = body;

    // Only handle signal create events
    if (!event || event.type !== 'create' || !signal || !signal.id) {
      return Response.json({ message: 'Not a create event' }, { status: 200 });
    }

    // Only check signals still in an active (unresolved) state
    const activeStatuses = ['new', 'viewed', 'executed', 'tp1_hit', 'tp2_hit'];
    if (!activeStatuses.includes(signal.status)) {
      return Response.json({ message: 'Signal not active', status: signal.status }, { status: 200 });
    }

    const yahoo = mapSymbol(signal.symbol);
    if (!yahoo) {
      return Response.json({ message: 'Symbol not mappable', symbol: signal.symbol }, { status: 200 });
    }

    const currentPrice = await fetchPrice(yahoo);
    if (!currentPrice) {
      return Response.json({ message: 'Price unavailable', symbol: signal.symbol }, { status: 200 });
    }

    const newStatus = checkSignalHit(signal, currentPrice);
    if (!newStatus || newStatus === signal.status) {
      return Response.json({ success: true, hit: false, price: currentPrice });
    }

    // Hit detected on arrival — update + notify immediately
    await base44.asServiceRole.entities.Signal.update(signal.id, {
      status: newStatus,
      resolved_at: new Date().toISOString(),
    });
    const notified = await sendHitNotifications(base44, {}, [{ signal, newStatus, currentPrice }]);

    console.log(`[checkNewSignal] Instant hit: ${signal.symbol} ${signal.action} → ${newStatus} at ${currentPrice}`);
    return Response.json({ success: true, hit: true, newStatus, price: currentPrice, notified });
  } catch (error) {
    console.error('checkNewSignal error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});