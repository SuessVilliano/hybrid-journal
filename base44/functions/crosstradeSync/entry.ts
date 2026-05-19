import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Pulls executions and account snapshots from CrossTrade into the journal.
 *
 * - Executions become Trade entries, keyed by (source='CrossTrade',
 *   source_trade_id), so repeated syncs are idempotent (upsert).
 * - Open positions + balances are written as an AccountSnapshot for risk
 *   tracking and prop-firm rule checks.
 * - Each run is recorded in SyncEventLog.
 *
 * Body: { connectionId? }
 *   - omit connectionId to sync every active CrossTrade connection the
 *     trader owns (headless "sync all").
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

function asArray(data: any): any[] {
  if (Array.isArray(data)) return data;
  return (
    data?.executions || data?.data || data?.results || data?.positions || data?.items || []
  );
}

function accountId(acct: any): string | null {
  if (!acct) return null;
  if (typeof acct === 'string') return acct;
  return acct.id || acct.account || acct.account_id || acct.name || null;
}

// Map a CrossTrade execution onto the journal's Trade shape. CrossTrade /
// NinjaTrader executions use varying field names, so read them flexibly.
function normalizeExecution(exec: any, account: string) {
  const id =
    exec.id ||
    exec.execution_id ||
    exec.executionId ||
    exec.exec_id ||
    exec.order_id ||
    exec.orderId ||
    null;
  if (!id) return null;

  const rawSide = String(
    exec.action ||
      exec.side ||
      exec.market_position ||
      exec.marketPosition ||
      exec.position ||
      '',
  ).toLowerCase();
  const side = rawSide.includes('sell') || rawSide.includes('short') ? 'short' : 'long';

  const qty = num(exec.qty ?? exec.quantity ?? exec.size ?? exec.contracts);
  const price = num(exec.price ?? exec.fill_price ?? exec.fillPrice ?? exec.avg_price);
  const exitPrice = num(exec.exit_price ?? exec.close_price ?? exec.closePrice) || null;
  const pnl = num(exec.pnl ?? exec.profit ?? exec.realized_pnl ?? exec.realizedPnl);
  const time =
    exec.time ||
    exec.timestamp ||
    exec.executed_at ||
    exec.fill_time ||
    exec.created_at ||
    new Date().toISOString();
  const closed =
    exitPrice != null ||
    pnl !== 0 ||
    ['closed', 'filled', 'complete'].includes(String(exec.status || '').toLowerCase());

  return {
    source: 'CrossTrade',
    source_trade_id: String(id),
    external_account_id: account,
    platform: 'CrossTrade',
    symbol: exec.instrument || exec.symbol || exec.contract || 'UNKNOWN',
    side,
    quantity: qty,
    entry_price: price,
    exit_price: exitPrice,
    entry_date: exec.entry_time || exec.entryTime || time,
    exit_date: exec.exit_time || exec.exitTime || (closed ? time : null),
    commission: num(exec.commission ?? exec.fees),
    pnl,
    pnl_net: pnl,
    trade_status: closed ? 'closed' : 'open',
    import_source: 'CrossTrade-Sync',
    raw_payload: exec,
  };
}

async function syncConnection(base44: any, user: any, connection: any) {
  const summary = {
    connectionId: connection.id,
    accounts: 0,
    tradesCreated: 0,
    tradesUpdated: 0,
    snapshots: 0,
    errors: [] as string[],
  };

  const configured =
    Array.isArray(connection.accounts) && connection.accounts.length > 0
      ? connection.accounts
      : connection.default_account
        ? [connection.default_account]
        : [];

  if (configured.length === 0) {
    summary.errors.push('No accounts configured on this connection');
    return summary;
  }

  for (const acct of configured) {
    const account = accountId(acct);
    if (!account) continue;
    summary.accounts++;

    // Executions -> Trade upserts
    try {
      const execRes = await base44.functions.invoke('crosstradeAPI', {
        action: 'executions',
        connectionId: connection.id,
        account,
      });
      const execData = execRes.data;

      if (execData?.ok) {
        for (const exec of asArray(execData.data)) {
          const trade = normalizeExecution(exec, account);
          if (!trade) continue;

          const existing = await base44.entities.Trade.filter({
            created_by: user.email,
            source: 'CrossTrade',
            source_trade_id: trade.source_trade_id,
          });

          if (existing.length > 0) {
            await base44.entities.Trade.update(existing[0].id, trade);
            summary.tradesUpdated++;
          } else {
            await base44.entities.Trade.create(trade);
            summary.tradesCreated++;
          }
        }
      } else {
        summary.errors.push(`executions(${account}): HTTP ${execData?.status || 'error'}`);
      }
    } catch (e) {
      summary.errors.push(`executions(${account}): ${e.message}`);
    }

    // Positions / balances -> AccountSnapshot
    try {
      const posRes = await base44.functions.invoke('crosstradeAPI', {
        action: 'positions',
        connectionId: connection.id,
        account,
      });
      const posData = posRes.data;

      if (posData?.ok) {
        const positions = asArray(posData.data);
        const d = posData.data || {};
        await base44.entities.AccountSnapshot.create({
          user_email: user.email,
          connection_id: connection.id,
          external_account_id: account,
          source: 'CrossTrade',
          timestamp: new Date().toISOString(),
          balance: num(d.balance ?? d.cash_value ?? d.cashValue),
          equity: num(d.equity ?? d.net_liquidation ?? d.netLiquidation),
          margin_used: num(d.margin_used ?? d.marginUsed),
          margin_available: num(d.buying_power ?? d.buyingPower ?? d.margin_available),
          open_positions: Array.isArray(positions) ? positions.length : 0,
          raw_masked_json: d,
        });
        summary.snapshots++;
      }
    } catch (e) {
      summary.errors.push(`positions(${account}): ${e.message}`);
    }
  }

  return summary;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));

    let connections: any[] = [];
    try {
      connections = body.connectionId
        ? await base44.entities.CrossTradeConnection.filter({
            id: body.connectionId,
            created_by: user.email,
          })
        : await base44.entities.CrossTradeConnection.filter({
            created_by: user.email,
            status: 'active',
          });
    } catch {
      connections = [];
    }

    if (!connections || connections.length === 0) {
      return Response.json(
        { success: true, message: 'No active CrossTrade connections to sync', synced: 0 },
        { headers: corsHeaders },
      );
    }

    const results = [];
    let totalCreated = 0;
    let totalUpdated = 0;

    for (const connection of connections) {
      const summary = await syncConnection(base44, user, connection);
      results.push(summary);
      totalCreated += summary.tradesCreated;
      totalUpdated += summary.tradesUpdated;

      const failed =
        summary.errors.length > 0 &&
        summary.tradesCreated === 0 &&
        summary.tradesUpdated === 0 &&
        summary.snapshots === 0;

      await base44.entities.CrossTradeConnection.update(connection.id, {
        last_sync_at: new Date().toISOString(),
        last_error: summary.errors.length > 0 ? summary.errors.join('; ') : null,
        status: failed ? 'error' : 'active',
        total_trades_synced:
          (connection.total_trades_synced || 0) +
          summary.tradesCreated +
          summary.tradesUpdated,
      });

      await base44.entities.SyncEventLog.create({
        event_id: `crosstrade_sync_${connection.id}_${Date.now()}`,
        user_email: user.email,
        connection_id: connection.id,
        event_type: 'crosstrade.sync',
        source: 'CrossTrade',
        status: failed ? 'failed' : 'processed',
        processed_at: new Date().toISOString(),
        trades_created: summary.tradesCreated,
        trades_updated: summary.tradesUpdated,
        trades_skipped: 0,
        error_message: summary.errors.length > 0 ? summary.errors.join('; ') : null,
        payload: summary,
      });
    }

    return Response.json(
      {
        success: true,
        synced: connections.length,
        tradesCreated: totalCreated,
        tradesUpdated: totalUpdated,
        results,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { success: false, error: error.message },
      { status: 500, headers: corsHeaders },
    );
  }
});
