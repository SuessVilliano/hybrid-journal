// krakenSyncPull — scheduled + manual Kraken position sync into the journal.
//
// Pulls the owner's current open Kraken positions from the Hybrid Execution
// gateway and mirrors them into Trade records:
//   - new open positions  → Trade { trade_status: 'open' } created (dedup by broker_trade_id)
//   - changed positions   → updated in place
//   - positions that vanished → flipped to trade_status: 'closed' (exit_date set; the
//     krakenWebhook push carries the real exit price / pnl when it arrives)
//
// Triggered two ways:
//   1. Scheduled automation (no user) — processes every Kraken BrokerConnection
//      with auto_sync_enabled = true, via the service role.
//   2. Manual "Sync now" from the /connect page (authenticated user) — processes
//      only that user's Kraken connection(s).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { decryptSecret } from './helpers/secrets.js';

const GATEWAY_URL = 'https://hybridzone-api.onrender.com';

async function sha256HexK(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function krakenPrivateReq(method: string, postData: string, apiKey: string, apiSecret: string): Promise<any> {
  const path = `/0/private/${method}`;
  const nonce = new URLSearchParams(postData).get('nonce') || '';
  const sha = await sha256HexK(nonce + postData);
  const key = await crypto.subtle.importKey('raw', Uint8Array.from(atob(apiSecret), c => c.charCodeAt(0)), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(path + sha));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  const r = await fetch(`https://api.kraken.com${path}`, { method: 'POST', headers: { 'API-Key': apiKey, 'API-Sign': signature, 'Content-Type': 'application/x-www-form-urlencoded' }, body: postData });
  return await r.json().catch(() => ({}));
}

// If the connection has an encrypted in-app read-only Kraken key, fetch fresh
// balance/equity directly from Kraken (proves the real account link + keeps the
// card current). Returns null if no key or the call fails (positions still sync
// via the gateway independently).
async function krakenBalanceFromConn(conn: any): Promise<{ balance?: number; equity?: number; currency?: string } | null> {
  try {
    if (!conn.api_key || !conn.api_secret) return null;
    const ak = await decryptSecret(conn.api_key);
    const ask = await decryptSecret(conn.api_secret);
    if (!ak || !ask) return null;
    const bal = await krakenPrivateReq('Balance', `nonce=${String(Date.now())}`, ak, ask);
    if (bal?.error?.length) return null;
    let b = 0;
    if (bal?.result && typeof bal.result === 'object') {
      for (const [k, v] of Object.entries(bal.result)) { if (k.startsWith('Z')) b += Number(v); }
    }
    let e = b;
    try {
      const tb = await krakenPrivateReq('TradeBalance', `nonce=${String(Date.now() + 1)}&asset=USD`, ak, ask);
      if (tb?.result?.tb) e = Number(tb.result.tb);
    } catch { /* TradeBalance optional */ }
    return { balance: b, equity: e, currency: 'USD' };
  } catch {
    return null;
  }
}

function gatewayKey(): string {
  return Deno.env.get('HYBRID_EXECUTION_API_KEY') || '';
}

async function krakenGateway(path: string, method = 'GET', body?: unknown): Promise<any> {
  const key = gatewayKey();
  if (!key) throw new Error('HYBRID_EXECUTION_API_KEY not configured on Hybrid Journal');
  const r = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data?.error || (Array.isArray(data?.errors) ? data.errors.join('; ') : `Gateway HTTP ${r.status}`));
  }
  return data;
}

function normalizeSymbol(sym?: string): string | undefined {
  if (!sym) return sym;
  return String(sym).toUpperCase().replace('XBT', 'BTC');
}

function pickId(pos: any): string | null {
  return pos?.id || pos?.txid || pos?.tradeId || pos?.orderId || pos?.refid || pos?.posid || pos?.posId || null;
}

function asPositions(data: any): any[] {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.positions)) return data.positions;
  if (Array.isArray(data?.data)) return data.data;
  if (data?.positions && typeof data.positions === 'object') return Object.values(data.positions);
  return [];
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let user: any = null;
    try { user = await base44.auth.me(); } catch { /* scheduled invocation has no user */ }
    const isManual = !!user;

    let connections: any[] = [];
    if (isManual) {
      const all = await base44.entities.BrokerConnection.list('-created_date', 100);
      connections = all.filter((c: any) => c.provider === 'Kraken' || c.settings_json?.broker_id === 'kraken');
    } else {
      const all = await base44.asServiceRole.entities.BrokerConnection.list('-created_date', 200);
      connections = all.filter((c: any) =>
        (c.provider === 'Kraken' || c.settings_json?.broker_id === 'kraken') && c.auto_sync_enabled
      );
    }

    const results: any[] = [];
    for (const conn of connections) {
      try {
        const mode = encodeURIComponent(String(conn.settings_json?.mode || 'paper').toLowerCase());
        const positionsData = await krakenGateway(`/api/execution/positions?broker=kraken&mode=${mode}`);
        const positions = asPositions(positionsData);

        const existing = await base44.asServiceRole.entities.Trade.filter({
          broker_connection_id: conn.id,
          trade_status: 'open'
        });
        const existingById = new Map(
          (existing || []).filter((t: any) => t.broker_trade_id).map((t: any) => [t.broker_trade_id, t])
        );
        const seenIds = new Set<string>();

        let created = 0, updated = 0, closed = 0;
        for (const pos of positions) {
          const btidRaw = pickId(pos);
          if (!btidRaw) continue;
          const btid = String(btidRaw);
          seenIds.add(btid);

          const symbol = normalizeSymbol(pos?.symbol || pos?.pair);
          const dir = String(pos?.side || pos?.direction || '').toLowerCase();
          const side = dir === 'sell' || dir === 'short' ? 'Short' : 'Long';
          const entryPrice = Number(pos?.entryPrice ?? pos?.price ?? pos?.avgPrice ?? 0);
          const qty = Number(pos?.qty ?? pos?.volume ?? pos?.amount ?? 0);

          const tradeData: any = {
            source: 'Kraken',
            source_trade_id: btid,
            broker_trade_id: btid,
            broker_connection_id: conn.id,
            connection_id: conn.id,
            symbol,
            platform: 'Other',
            instrument_type: 'Crypto',
            side,
            entry_date: pos?.openTime || pos?.entryTime || pos?.time || new Date().toISOString(),
            entry_price: entryPrice,
            quantity: qty,
            trade_status: 'open',
            created_by_id: conn.created_by_id
          };

          const existingTrade = existingById.get(btid);
          if (existingTrade) {
            await base44.asServiceRole.entities.Trade.update(existingTrade.id, {
              entry_price: entryPrice,
              quantity: qty,
              symbol: tradeData.symbol
            });
            updated++;
          } else {
            await base44.asServiceRole.entities.Trade.create(tradeData);
            created++;
          }
        }

        for (const [btid, t] of existingById) {
          if (!seenIds.has(btid)) {
            await base44.asServiceRole.entities.Trade.update(t.id, {
              trade_status: 'closed',
              exit_date: new Date().toISOString()
            });
            closed++;
          }
        }

        const bal = await krakenBalanceFromConn(conn);
        const connUpdate: any = {
          last_sync_at: new Date().toISOString(),
          status: 'connected'
        };
        if (bal) {
          connUpdate.account_balance = bal.balance;
          connUpdate.account_equity = bal.equity;
          connUpdate.settings_json = { ...(conn.settings_json || {}), balance: bal.balance, equity: bal.equity, currency: bal.currency, last_balance_at: new Date().toISOString() };
        }
        await base44.asServiceRole.entities.BrokerConnection.update(conn.id, connUpdate);

        results.push({
          connection_id: conn.id,
          display_name: conn.display_name,
          mode: conn.settings_json?.mode || 'paper',
          positions: positions.length,
          created,
          updated,
          closed,
          balance: bal?.balance,
          equity: bal?.equity
        });
      } catch (e) {
        results.push({ connection_id: conn.id, display_name: conn.display_name, error: (e as Error).message });
      }
    }

    return Response.json({ ok: true, manual: isManual, connections: connections.length, results });
  } catch (error) {
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}