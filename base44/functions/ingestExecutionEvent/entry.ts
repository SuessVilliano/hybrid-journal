import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

async function hmacHex(secret: string, timestamp: string, rawBody: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${rawBody}`));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function mask(value: any): any {
  if (!value || typeof value !== 'object') return value;
  const out: any = Array.isArray(value) ? [...value] : { ...value };
  const sensitive = ['secret', 'password', 'token', 'apikey', 'api_key', 'authorization', 'bearer'];
  for (const key of Object.keys(out)) {
    if (sensitive.some(s => key.toLowerCase().includes(s))) out[key] = '***MASKED***';
    else if (typeof out[key] === 'object') out[key] = mask(out[key]);
  }
  return out;
}

function isBrokerFill(event: any) {
  return event.eventType === 'execution.filled' && event.brokerConfirmed === true && Boolean(event.brokerOrderId);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'method_not_allowed' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const timestamp = req.headers.get('X-Timestamp') || '';
    const signature = req.headers.get('X-Signature') || '';
    const eventId = req.headers.get('X-Event-Id') || body.eventId;
    if (!timestamp || !signature || !eventId) return Response.json({ error: 'missing_signed_event_headers' }, { status: 400 });

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - Number(timestamp)) > 300) return Response.json({ error: 'replay_window_exceeded' }, { status: 401 });

    const apps = await base44.asServiceRole.entities.ConnectedApp.filter({
      user_id: body.userId,
      app_name: body.source || 'HybridCopy',
      status: 'active'
    });
    if (!apps.length) return Response.json({ error: 'no_active_connection' }, { status: 404 });
    const app = apps[0];
    const expected = await hmacHex(app.signing_secret_ref, timestamp, rawBody);
    if (expected.toLowerCase() !== signature.toLowerCase()) return Response.json({ error: 'invalid_signature' }, { status: 401 });

    const existing = await base44.asServiceRole.entities.ExecutionEvent.filter({ event_id: eventId });
    if (existing.length) return Response.json({ ok: true, status: 'DUPLICATE', eventId });

    const event = {
      event_id: eventId,
      event_type: body.eventType,
      source: body.source || 'HybridCopy',
      user_email: app.user_email,
      signal_id: body.signalId || null,
      intent_id: body.intentId || null,
      execution_id: body.executionId || null,
      master_execution_id: body.masterExecutionId || null,
      copy_relationship_id: body.copyRelationshipId || null,
      connection_id: body.connectionId || null,
      account_external_id: body.accountExternalId || null,
      venue: body.venue || body.provider || null,
      environment: body.environment || 'DEMO',
      symbol: body.symbol || null,
      canonical_symbol: body.canonicalSymbol || null,
      side: body.side || null,
      order_type: body.orderType || null,
      requested_quantity: body.requestedQuantity ?? body.quantity ?? null,
      filled_quantity: body.filledQuantity ?? null,
      requested_price: body.requestedPrice ?? null,
      fill_price: body.fillPrice ?? null,
      stop_loss: body.stopLoss ?? null,
      take_profit: body.takeProfit ?? null,
      broker_order_id: body.brokerOrderId || null,
      broker_position_id: body.brokerPositionId || null,
      broker_status: body.brokerStatus || null,
      fees: body.fees ?? null,
      realized_pnl: body.realizedPnl ?? null,
      occurred_at: body.occurredAt || new Date().toISOString(),
      broker_confirmed: body.brokerConfirmed === true,
      raw_masked_payload: mask(body.brokerPayload || body.rawPayload || {})
    };

    await base44.asServiceRole.entities.ExecutionEvent.create(event);

    let tradeId = null;
    if (isBrokerFill(body)) {
      const sourceTradeId = body.brokerPositionId || body.brokerOrderId;
      const duplicates = await base44.asServiceRole.entities.Trade.filter({
        created_by: app.user_email,
        source: body.venue || body.provider || body.source,
        source_trade_id: sourceTradeId
      });
      const tradeData = {
        source: body.venue || body.provider || body.source,
        source_trade_id: sourceTradeId,
        connection_id: body.connectionId || null,
        external_account_id: body.accountExternalId || null,
        symbol: body.symbol,
        side: String(body.side).toUpperCase() === 'SELL' ? 'Short' : 'Long',
        entry_date: body.occurredAt || new Date().toISOString(),
        entry_price: body.fillPrice,
        quantity: body.filledQuantity ?? body.quantity,
        stop_loss: body.stopLoss ?? null,
        take_profit: body.takeProfit ?? null,
        commission: body.fees ?? 0,
        pnl: body.realizedPnl ?? 0,
        pnl_net: body.realizedPnl ?? 0,
        strategy: body.strategy || null,
        trade_status: 'open',
        import_source: 'Hybrid Ecosystem',
        custom_fields: {
          signal_id: body.signalId || null,
          intent_id: body.intentId || null,
          execution_id: body.executionId || null,
          master_execution_id: body.masterExecutionId || null,
          copy_relationship_id: body.copyRelationshipId || null,
          environment: body.environment || 'DEMO',
          broker_order_id: body.brokerOrderId,
          broker_confirmed: true,
          canonical_symbol: body.canonicalSymbol || null
        },
        raw_payload: mask(body.brokerPayload || body.rawPayload || {})
      };
      if (duplicates.length) {
        await base44.asServiceRole.entities.Trade.update(duplicates[0].id, tradeData);
        tradeId = duplicates[0].id;
      } else {
        const created = await base44.asServiceRole.entities.Trade.create(tradeData);
        tradeId = created.id;
      }
    }

    return Response.json({ ok: true, status: 'PROCESSED', eventId, tradeCreatedOrUpdated: Boolean(tradeId), tradeId });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
