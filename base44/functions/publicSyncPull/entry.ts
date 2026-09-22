// publicSyncPull — Public brokerage history + account snapshot sync into Hybrid Journal.
//
// Public credentials remain on the Hybrid Execution Gateway. Hybrid Journal never
// stores the Public Secret Token. This function pulls broker-confirmed history and
// deduplicates by Public transaction id.
//
// Current deployment mode: one gateway-configured Public account (development/internal).
// Production multi-user authorization should use Public's approved partner integration.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const GATEWAY_URL = (Deno.env.get('HYBRID_EXECUTION_URL') || 'https://hybridzone-api.onrender.com').replace(/\/$/, '');

function gatewayKey(): string {
  return Deno.env.get('HYBRID_EXECUTION_API_KEY') || Deno.env.get('THZ_API_KEY') || '';
}

async function gateway(path: string): Promise<any> {
  const key = gatewayKey();
  if (!key) throw new Error('HYBRID_EXECUTION_API_KEY not configured on Hybrid Journal');
  const r = await fetch(`${GATEWAY_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data?.error || `Gateway HTTP ${r.status}`);
  return data;
}

function instrumentType(securityType?: string): string {
  const t = String(securityType || '').toUpperCase();
  if (t === 'OPTION' || t === 'MULTI_LEG_INSTRUMENT') return 'Options';
  if (t === 'CRYPTO') return 'Crypto';
  if (t === 'BOND' || t === 'TREASURY') return 'Bonds';
  return 'Stocks';
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function executionPrice(tx: any): number {
  const qty = Math.abs(num(tx?.quantity));
  const principal = Math.abs(num(tx?.principalAmount));
  if (qty > 0 && principal > 0) return principal / qty;
  const net = Math.abs(num(tx?.netAmount));
  return qty > 0 && net > 0 ? net / qty : 0;
}

async function historyPages(accountId?: string, start?: string): Promise<any[]> {
  const all: any[] = [];
  let nextToken = '';
  for (let page = 0; page < 10; page++) {
    const qs = new URLSearchParams({ broker: 'public' });
    if (accountId) qs.set('accountId', accountId);
    if (start) qs.set('start', start);
    qs.set('pageSize', '200');
    if (nextToken) qs.set('nextToken', nextToken);
    const data = await gateway(`/api/execution/history?${qs.toString()}`);
    all.push(...(Array.isArray(data?.transactions) ? data.transactions : []));
    nextToken = data?.nextToken || '';
    if (!nextToken) break;
  }
  return all;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let user: any = null;
    try { user = await base44.auth.me(); } catch { /* scheduled invocation */ }
    const service = base44.asServiceRole;

    const allConnections = user
      ? await base44.entities.BrokerConnection.list('-created_date', 100)
      : await service.entities.BrokerConnection.list('-created_date', 200);

    const connections = (allConnections || []).filter((c: any) =>
      (c.provider === 'Public' || c.broker_id === 'public' || c.settings_json?.broker_id === 'public') &&
      (user || c.auto_sync_enabled)
    );

    const results: any[] = [];

    for (const conn of connections) {
      try {
        const accountId = String(conn.settings_json?.public_account_id || conn.account_number || '').trim() || undefined;
        const qs = new URLSearchParams({ broker: 'public', mode: 'live' });
        if (accountId) qs.set('accountId', accountId);
        const snapshot = await gateway(`/api/execution/account-snapshot?${qs.toString()}`);
        const portfolio = snapshot?.account || {};

        // Re-read a small overlap on subsequent syncs to catch delayed postings.
        let start: string | undefined;
        if (conn.last_sync_at) {
          const d = new Date(conn.last_sync_at);
          if (!Number.isNaN(d.getTime())) {
            d.setHours(d.getHours() - 24);
            start = d.toISOString();
          }
        }

        const transactions = await historyPages(accountId, start);
        const tradeTx = transactions.filter((t: any) => String(t?.type || '').toUpperCase() === 'TRADE' && t?.id);

        const existing = await service.entities.Trade.filter({ broker_connection_id: conn.id });
        const existingIds = new Set(
          (existing || []).flatMap((t: any) => [t.broker_trade_id, t.source_trade_id]).filter(Boolean).map(String)
        );

        let imported = 0, skipped = 0;
        for (const tx of tradeTx) {
          const id = String(tx.id);
          if (existingIds.has(id)) { skipped++; continue; }

          const sideRaw = String(tx.side || '').toUpperCase();
          const qty = Math.abs(num(tx.quantity));
          const fees = Math.abs(num(tx.fees));
          await service.entities.Trade.create({
            source: 'Public',
            source_trade_id: id,
            broker_trade_id: id,
            broker_connection_id: conn.id,
            connection_id: conn.id,
            external_account_id: tx.accountNumber || accountId,
            account_id: conn.account_id,
            symbol: tx.symbol || 'UNKNOWN',
            platform: 'Public',
            instrument_type: instrumentType(tx.securityType),
            side: sideRaw === 'SELL' ? 'Short' : 'Long',
            execution_side: sideRaw || undefined,
            security_type: tx.securityType || undefined,
            entry_date: tx.timestamp || new Date().toISOString(),
            entry_price: executionPrice(tx),
            quantity: qty,
            commission: fees,
            pnl: 0,
            pnl_net: -fees,
            trade_status: 'closed',
            import_source: 'Public API Sync',
            notes: `Broker-confirmed Public execution (${sideRaw || 'UNKNOWN'}). Position-level direction is reconciled from the live Public portfolio.`,
            raw_payload: tx,
          });
          imported++;
          existingIds.add(id);
        }

        const totalValue = num(portfolio?.totalAccountValue);
        const cash = num(portfolio?.cash);
        await service.entities.BrokerConnection.update(conn.id, {
          provider: 'Public',
          broker_id: 'public',
          broker_name: 'Public',
          status: 'connected',
          account_balance: cash,
          account_equity: totalValue,
          account_number: conn.account_number || portfolio?.accountId || accountId,
          last_sync: new Date().toISOString(),
          last_sync_at: new Date().toISOString(),
          settings_json: {
            ...(conn.settings_json || {}),
            broker_id: 'public',
            public_account_id: portfolio?.accountId || accountId || null,
            account_type: portfolio?.accountType || null,
            buying_power: portfolio?.buyingPower || null,
            cash,
            total_account_value: totalValue,
            positions_count: Array.isArray(portfolio?.positions) ? portfolio.positions.length : 0,
          }
        });

        results.push({
          connection_id: conn.id,
          account_id: portfolio?.accountId || accountId || null,
          transactions: tradeTx.length,
          imported,
          skipped,
          positions: Array.isArray(portfolio?.positions) ? portfolio.positions.length : 0,
          total_account_value: totalValue,
          account_balance: cash,
          account_equity: totalValue,
        });
      } catch (e) {
        results.push({ connection_id: conn.id, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const imported = results.reduce((sum: number, r: any) => sum + Number(r?.imported || 0), 0);
    const skipped = results.reduce((sum: number, r: any) => sum + Number(r?.skipped || 0), 0);
    const first = results.find((r: any) => !r?.error) || {};
    return Response.json({
      ok: true,
      manual: !!user,
      connections: connections.length,
      imported,
      skipped,
      account_balance: first.account_balance,
      account_equity: first.account_equity,
      results
    });
  } catch (error) {
    return Response.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
