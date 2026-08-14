import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { mapSymbol, fetchAllPrices, checkSignalHit, sendHitNotifications } from '../../shared/signalMonitor.ts';

const WEBHOOK_TOKEN = 'hj_update_9x2k_signals_2026';
// Only monitor signals created within this window — price should hit TP1/SL within 2h.
// Older signals stop being checked automatically, which avoids burning credits on stale signals.
const MONITOR_WINDOW_HOURS = 2;

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token;

    // Auth: token for scheduled/direct calls (incl. the manual refresh button)
    if (!token || token !== WEBHOOK_TOKEN) {
      return Response.json({ error: 'Invalid or missing token' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    // Only check signals created within the last 2 hours AND still in an active state.
    // This is the credit saver: idle periods return ~instantly with no price fetches.
    const since = new Date(Date.now() - MONITOR_WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    const [newSigs, viewedSigs, executedSigs, tp1Sigs, tp2Sigs] = await Promise.all([
      base44.asServiceRole.entities.Signal.filter({ status: 'new', created_date: { $gte: since } }, '-created_date', 500),
      base44.asServiceRole.entities.Signal.filter({ status: 'viewed', created_date: { $gte: since } }, '-created_date', 500),
      base44.asServiceRole.entities.Signal.filter({ status: 'executed', created_date: { $gte: since } }, '-created_date', 200),
      base44.asServiceRole.entities.Signal.filter({ status: 'tp1_hit', created_date: { $gte: since } }, '-created_date', 200),
      base44.asServiceRole.entities.Signal.filter({ status: 'tp2_hit', created_date: { $gte: since } }, '-created_date', 200),
    ]);

    const activeSignals = [...newSigs, ...viewedSigs, ...executedSigs, ...tp1Sigs, ...tp2Sigs];
    console.log(`[monitorSignalTargets] Checking ${activeSignals.length} signals created in last ${MONITOR_WINDOW_HOURS}h (new: ${newSigs.length}, viewed: ${viewedSigs.length}, executed: ${executedSigs.length}, tp1: ${tp1Sigs.length}, tp2: ${tp2Sigs.length})`);

    if (activeSignals.length === 0) {
      return Response.json({ success: true, checked: 0, updated: 0, notified: 0, message: 'No active signals in monitoring window' });
    }

    // Map unique platform symbols to Yahoo Finance symbols
    const symbolMap = {};
    activeSignals.forEach(s => {
      if (s.symbol && !symbolMap[s.symbol]) symbolMap[s.symbol] = mapSymbol(s.symbol);
    });

    const uniqueSymbols = Object.entries(symbolMap)
      .filter(([, yahoo]) => yahoo !== null)
      .map(([platform, yahoo]) => ({ platform, yahoo }));

    const prices = await fetchAllPrices(uniqueSymbols);
    console.log(`[monitorSignalTargets] Got prices for ${Object.keys(prices).length}/${uniqueSymbols.length} symbols`);

    const updates = [];
    const hitEvents = [];
    let tp1Count = 0, tp2Count = 0, fullTargetCount = 0, stoppedOutCount = 0;
    const skippedSymbols = [];

    for (const signal of activeSignals) {
      const currentPrice = prices[signal.symbol];
      if (!currentPrice) {
        if (!skippedSymbols.includes(signal.symbol)) skippedSymbols.push(signal.symbol);
        continue;
      }

      const newStatus = checkSignalHit(signal, currentPrice);
      if (!newStatus || newStatus === signal.status) continue;

      try {
        await base44.asServiceRole.entities.Signal.update(signal.id, {
          status: newStatus,
          resolved_at: new Date().toISOString(),
        });
        updates.push({ id: signal.id, symbol: signal.symbol, from: signal.status, to: newStatus, price: currentPrice });
        hitEvents.push({ signal, newStatus, currentPrice });

        if (newStatus === 'tp1_hit') tp1Count++;
        else if (newStatus === 'tp2_hit') tp2Count++;
        else if (newStatus === 'full_target') fullTargetCount++;
        else if (newStatus === 'stopped_out') stoppedOutCount++;
      } catch (e) {
        console.error(`[monitorSignalTargets] Failed to update signal ${signal.id}:`, e.message);
      }
    }

    console.log(`[monitorSignalTargets] Updated ${updates.length} signals: ${tp1Count} tp1, ${tp2Count} tp2, ${fullTargetCount} full_target, ${stoppedOutCount} stopped_out`);

    let notified = 0;
    if (hitEvents.length > 0) {
      notified = await sendHitNotifications(base44, {}, hitEvents);
      console.log(`[monitorSignalTargets] Sent ${notified} notifications for ${hitEvents.length} hit signals`);
    }

    return Response.json({
      success: true,
      checked: activeSignals.length,
      pricesFound: Object.keys(prices).length,
      updated: updates.length,
      notified,
      breakdown: { tp1_hit: tp1Count, tp2_hit: tp2Count, full_target: fullTargetCount, stopped_out: stoppedOutCount },
      updates,
      skippedSymbols: skippedSymbols.length > 0 ? skippedSymbols : undefined,
    });
  } catch (error) {
    console.error('monitorSignalTargets error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});