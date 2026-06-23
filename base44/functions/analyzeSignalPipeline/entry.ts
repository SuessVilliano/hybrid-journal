import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// AI audit agent backend: analyzes the user's signal pipeline for health,
// status/provider breakdowns, and early-warning issues (missing fields,
// stale signals, unresolved positions, duplicates).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const hours = Number(body.hours) || 24;

    const signals = await base44.entities.Signal.filter(
      { user_email: user.email },
      '-created_date',
      500
    );

    const byStatus = {};
    const byProvider = {};
    const issues = [];
    let missingFields = 0, stale = 0, unresolved = 0, duplicates = 0;
    const dupMap = new Map();
    const now = Date.now();

    signals.forEach((s) => {
      byStatus[s.status || 'unknown'] = (byStatus[s.status || 'unknown'] || 0) + 1;
      byProvider[s.provider || 'unknown'] = (byProvider[s.provider || 'unknown'] || 0) + 1;

      const created = s.created_date ? new Date(s.created_date).getTime() : 0;
      const ageH = created ? (now - created) / 3600000 : 0;

      // Missing key fields
      const missing = [];
      if (s.price == null) missing.push('price');
      if (s.stop_loss == null) missing.push('stop_loss');
      if (s.take_profit == null && (!s.take_profits || s.take_profits.length === 0)) missing.push('take_profit');
      if (missing.length) { missingFields++; issues.push({ signal_id: s.id, symbol: s.symbol, type: 'missing_fields', fields: missing }); }

      // Stale new/viewed signals (no action for >2h)
      if ((s.status === 'new' || s.status === 'viewed') && ageH > 2) {
        stale++;
        issues.push({ signal_id: s.id, symbol: s.symbol, type: 'stale', age_hours: +ageH.toFixed(1) });
      }

      // Unresolved active signals (>24h with no resolution)
      if (['executed', 'tp1_hit', 'tp2_hit'].includes(s.status) && !s.resolved_at && ageH > 24) {
        unresolved++;
        issues.push({ signal_id: s.id, symbol: s.symbol, type: 'unresolved', age_hours: +ageH.toFixed(1) });
      }

      // Duplicate detection (same symbol+action+price within 15 min)
      const key = `${s.symbol}|${s.action}|${s.price}`;
      if (dupMap.has(key)) {
        const prev = dupMap.get(key);
        if (created - prev < 15 * 60 * 1000) {
          duplicates++;
          issues.push({ signal_id: s.id, symbol: s.symbol, type: 'duplicate', price: s.price });
        }
      } else {
        dupMap.set(key, created);
      }
    });

    const total = signals.length;
    const active = (byStatus.new || 0) + (byStatus.viewed || 0) + (byStatus.executed || 0) + (byStatus.tp1_hit || 0) + (byStatus.tp2_hit || 0);
    const resolved = (byStatus.full_target || 0) + (byStatus.stopped_out || 0) + (byStatus.ignored || 0);
    const issueCount = missingFields + stale + unresolved + duplicates;
    const healthScore = total > 0 ? Math.max(0, Math.round(100 - (issueCount / total) * 100)) : 100;

    return Response.json({
      status: 'success',
      window_hours: hours,
      total,
      active,
      resolved,
      by_status: byStatus,
      by_provider: byProvider,
      health_score: healthScore,
      issue_summary: { missing_fields: missingFields, stale, unresolved, duplicates },
      issues: issues.slice(0, 50),
      summary: `Pipeline health ${healthScore}/100 — ${total} signals, ${issueCount} issues (${missingFields} missing fields, ${stale} stale, ${unresolved} unresolved, ${duplicates} duplicates).`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});