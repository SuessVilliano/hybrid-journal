// krakenWebhook — token-authenticated push endpoint for closed Kraken trades.
//
// Your Render Command Center API / Hybrid Zone gateway POSTs a closed (or
// updated) trade here the moment it fills, so the journal has real exit price
// and P&L without waiting for the next scheduled pull.
//
//   POST https://hybridjournal.base44.app/functions/krakenWebhook
//   Authorization: Bearer <KRAKEN_WEBHOOK_TOKEN>
//   Body: {
//     event_id,            // unique id for idempotency (recommended)
//     user_email,          // journal user who owns this trade
//     connection_id,       // optional BrokerConnection id
//     provider, source,    // defaults to "Kraken"
//     trade: {
//       sourceTradeId, symbol, side, qty,
//       entryTime, entryPrice,
//       exitTime, exitPrice,           // null/absent for still-open trades
//       pnlNet, fees: { commission, swap },
//       status,                        // "closed" | "open"
//       accountExternalId, rawMaskedJson
//     }
//   }
//
// Dedup: by event_id (SyncEventLog) and by broker_trade_id (Trade upsert).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const token = Deno.env.get('KRAKEN_WEBHOOK_TOKEN');
    if (!token) return Response.json({ error: 'KRAKEN_WEBHOOK_TOKEN not configured' }, { status: 500 });
    const auth = req.headers.get('authorization') || '';
    const provided = auth.replace(/^Bearer\s+/i, '').trim();
    if (!provided || provided !== token) {
      return Response.json({ error: 'Unauthorized: invalid webhook token' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_email, connection_id, trade, provider, source, event_id } = body;
    if (!user_email || !trade || !trade.sourceTradeId) {
      return Response.json({ error: 'user_email and trade.sourceTradeId are required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Idempotency by event_id
    if (event_id) {
      const dup = await base44.asServiceRole.entities.SyncEventLog.filter({ event_id });
      if (dup && dup.length > 0) {
        return Response.json({ ok: true, status: 'DUPLICATE', event_id });
      }
    }

    // Resolve the journal user id so the Trade is owned by them (RLS read = created_by_id)
    const users = await base44.asServiceRole.entities.User.filter({ email: user_email });
    const userId = users?.[0]?.id || null;

    const btid = String(trade.sourceTradeId);
    const status = String(trade.status || 'closed').toLowerCase();
    const src = provider || source || 'Kraken';

    const existing = await base44.asServiceRole.entities.Trade.filter({ broker_trade_id: btid, source: src });
    const existingTrade = existing?.[0];

    const tradeData: any = {
      source: src,
      source_trade_id: btid,
      broker_trade_id: btid,
      broker_connection_id: connection_id || null,
      connection_id: connection_id || null,
      external_account_id: trade.accountExternalId || null,
      symbol: trade.symbol,
      platform: 'Other',
      instrument_type: 'Crypto',
      side: trade.side,
      entry_date: trade.entryTime || (existingTrade?.entry_date) || new Date().toISOString(),
      entry_price: Number(trade.entryPrice ?? existingTrade?.entry_price ?? 0),
      exit_date: trade.exitTime || null,
      exit_price: trade.exitPrice || null,
      quantity: Number(trade.qty ?? existingTrade?.quantity ?? 0),
      commission: trade.fees?.commission || existingTrade?.commission || 0,
      swap: trade.fees?.swap || existingTrade?.swap || 0,
      pnl: trade.pnlNet || 0,
      pnl_net: trade.pnlNet || 0,
      trade_status: status === 'open' ? 'open' : 'closed',
      raw_payload: trade.rawMaskedJson || {},
      import_source: 'kraken-webhook'
    };
    if (userId) tradeData.created_by_id = userId;

    let result: string;
    if (existingTrade) {
      await base44.asServiceRole.entities.Trade.update(existingTrade.id, tradeData);
      result = 'updated';
    } else {
      await base44.asServiceRole.entities.Trade.create(tradeData);
      result = 'created';
    }

    await base44.asServiceRole.entities.SyncEventLog.create({
      event_id: event_id || `kraken-${btid}-${Date.now()}`,
      user_email,
      event_type: status === 'open' ? 'trade.updated' : 'trade.closed',
      source: src,
      connection_id: connection_id || null,
      payload: body,
      status: 'processed',
      processed_at: new Date().toISOString(),
      trades_created: result === 'created' ? 1 : 0,
      trades_updated: result === 'updated' ? 1 : 0
    });

    return Response.json({ ok: true, status: 'OK', result, broker_trade_id: btid });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}