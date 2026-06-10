import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { decryptSecret } from './helpers/secrets.js';

// Brokers with a real API integration in this function. Everything else gets
// a clear "not supported" error — we NEVER fabricate simulated trades or
// balances (see AUDIT.md critical #1).
const SYNCABLE_BROKERS = ['binance'];

const BINANCE_BASE = 'https://api.binance.com';
const BINANCE_RECV_WINDOW = 10000;

// Default spot symbols to sync when the connection doesn't specify any.
// TODO: make this configurable from the connection form instead of a constant.
const DEFAULT_BINANCE_SYMBOLS = ['BTCUSDT', 'ETHUSDT'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connection_id } = await req.json();

    if (!connection_id) {
      return Response.json({ error: 'connection_id is required' }, { status: 400 });
    }

    // Get broker connection
    const connections = await base44.entities.BrokerConnection.filter({ id: connection_id });
    if (!connections || connections.length === 0) {
      return Response.json({ error: 'Broker connection not found' }, { status: 404 });
    }

    const connection = connections[0];
    const startTime = Date.now();

    // Refuse brokers without a real integration instead of fabricating data.
    if (!SYNCABLE_BROKERS.includes(connection.broker_id)) {
      return Response.json({
        error: `Automatic sync for ${connection.broker_name || connection.broker_id} is not yet supported. Use statement upload instead.`
      }, { status: 400 });
    }

    // Fetch trades from broker using the backend integration
    const brokerData = await fetchBrokerTrades(connection);

    // Get existing trades to avoid duplicates
    const existingTrades = await base44.entities.Trade.filter({
      broker_connection_id: connection.id
    });

    const existingByBrokerId = new Map(
      existingTrades
        .filter(t => t.broker_trade_id)
        .map(t => [t.broker_trade_id, t])
    );

    const imported = [];
    const updated = [];
    let skipped = 0;
    const errors = [];

    // Process each trade
    for (const brokerTrade of brokerData.trades || []) {
      try {
        // Check if trade already exists
        if (brokerTrade.broker_trade_id && existingByBrokerId.has(brokerTrade.broker_trade_id)) {
          const existingTrade = existingByBrokerId.get(brokerTrade.broker_trade_id);

          // Update if trade status changed (opened -> closed)
          if (!existingTrade.exit_date && brokerTrade.exit_date) {
            await base44.entities.Trade.update(existingTrade.id, {
              exit_date: brokerTrade.exit_date,
              exit_price: brokerTrade.exit_price,
              pnl: brokerTrade.pnl,
              commission: brokerTrade.commission || existingTrade.commission,
              swap: brokerTrade.swap || existingTrade.swap
            });
            updated.push(existingTrade.id);
          } else {
            skipped++;
          }
          continue;
        }

        // New trade - import it
        const tradeData = {
          symbol: brokerTrade.symbol,
          side: brokerTrade.side,
          entry_date: brokerTrade.entry_date,
          exit_date: brokerTrade.exit_date,
          entry_price: brokerTrade.entry_price,
          exit_price: brokerTrade.exit_price,
          quantity: brokerTrade.quantity,
          pnl: brokerTrade.pnl,
          commission: brokerTrade.commission || 0,
          swap: brokerTrade.swap || 0,
          platform: connection.broker_name,
          instrument_type: getInstrumentType(connection.broker_id),
          broker_connection_id: connection.id,
          broker_trade_id: brokerTrade.broker_trade_id,
          import_source: `${connection.broker_name} API Sync`
        };

        const created = await base44.entities.Trade.create(tradeData);
        imported.push(created.id);

      } catch (tradeError) {
        errors.push({
          trade: brokerTrade.symbol || 'Unknown',
          error: tradeError.message
        });
      }
    }

    // Update connection with sync time — and the new balance only when the
    // broker actually reported one (never write a fabricated default).
    const connectionUpdate: Record<string, unknown> = {
      last_sync: new Date().toISOString(),
      status: 'connected'
    };
    if (typeof brokerData.account_balance === 'number') {
      connectionUpdate.account_balance = brokerData.account_balance;
      connectionUpdate.account_equity = brokerData.equity;
    }
    await base44.entities.BrokerConnection.update(connection.id, connectionUpdate);

    // Log the sync
    await base44.entities.SyncLog.create({
      broker_connection_id: connection.id,
      sync_type: 'manual',
      status: errors.length > 0 ? 'partial' : 'success',
      trades_fetched: brokerData.trades?.length || 0,
      trades_imported: imported.length,
      trades_skipped: skipped,
      trades_updated: updated.length,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: Date.now() - startTime,
      sync_timestamp: new Date().toISOString()
    });

    return Response.json({
      success: true,
      imported: imported.length,
      updated: updated.length,
      skipped: skipped,
      errors: errors,
      account_balance: brokerData.account_balance,
      account_equity: brokerData.equity
    });

  } catch (error) {
    console.error('Broker sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function fetchBrokerTrades(connection) {
  const { broker_id } = connection;

  if (broker_id === 'binance') {
    return fetchBinanceTrades(connection);
  }

  // Should be unreachable — the handler rejects unsupported brokers up front.
  throw new Error(
    `Automatic sync for ${connection.broker_name || broker_id} is not yet supported. Use statement upload instead.`
  );
}

// ---------------------------------------------------------------------------
// Binance (spot)
// ---------------------------------------------------------------------------

async function fetchBinanceTrades(connection) {
  // Credentials are stored encrypted at rest (see helpers/secrets) — decrypt
  // before signing. Legacy plaintext values pass through unchanged.
  const apiKey = await decryptSecret(connection.api_key || '');
  const apiSecret = await decryptSecret(connection.api_secret || '');
  if (!apiKey || !apiSecret) {
    throw new Error('Binance connection is missing an API key or secret');
  }

  const symbols = getBinanceSymbols(connection);
  const trades = [];

  for (const symbol of symbols) {
    const fills = await binanceSignedGet('/api/v3/myTrades', { symbol, limit: '1000' }, apiKey, apiSecret);
    trades.push(...buildBinanceRoundTrips(symbol, Array.isArray(fills) ? fills : []));
  }

  const result: { trades: unknown[]; account_balance?: number; equity?: number } = { trades };

  // Best-effort real balance. On failure we omit account_balance entirely —
  // never default to a made-up number.
  try {
    const balance = await fetchBinanceBalance(apiKey, apiSecret);
    result.account_balance = balance;
    result.equity = balance;
  } catch (e) {
    console.warn(`[syncBroker] Could not fetch Binance account balance: ${e.message}`);
  }

  return result;
}

// Symbols to sync: prefer an explicit list on the connection record
// (`symbols` or `settings_json.symbols`, array or comma-separated string),
// otherwise fall back to DEFAULT_BINANCE_SYMBOLS.
function getBinanceSymbols(connection) {
  const raw = connection.symbols ?? connection.settings_json?.symbols;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map(s => String(s).trim().toUpperCase()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
  }
  return DEFAULT_BINANCE_SYMBOLS;
}

// Sign a Binance request: HMAC-SHA256 of the query string with the API
// secret, appended as `signature=` (https://developers.binance.com/docs).
async function signBinanceQuery(queryString: string, apiSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(queryString)));
  return Array.from(sig).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function binanceSignedGet(path: string, params: Record<string, string>, apiKey: string, apiSecret: string) {
  const query = new URLSearchParams({
    ...params,
    recvWindow: String(BINANCE_RECV_WINDOW),
    timestamp: String(Date.now())
  }).toString();
  const signature = await signBinanceQuery(query, apiSecret);

  const response = await fetch(`${BINANCE_BASE}${path}?${query}&signature=${signature}`, {
    headers: { 'X-MBX-APIKEY': apiKey }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Binance API error ${response.status}: ${body || response.statusText}`);
  }

  return response.json();
}

// FIFO-match a symbol's fills into closed round-trip trades with REAL P&L.
// Binance spot is long-only: buys are queued as open lots, each sell closes
// the oldest lots first. One Trade is emitted per matched (buy lot, sell
// fill) pair; unmatched remaining buys are an open position and are NOT
// journaled as closed trades.
function buildBinanceRoundTrips(symbol, fills) {
  const sorted = [...fills].sort((a, b) => (a.time - b.time) || (a.id - b.id));

  // Commission is only deducted when paid in the quote currency (symbol ends
  // with commissionAsset, e.g. USDT for BTCUSDT). Commissions paid in the
  // base asset or BNB are excluded rather than guessed — converting them
  // would require historical prices (known limitation).
  const quoteCommission = (fill) =>
    fill.commissionAsset && symbol.endsWith(fill.commissionAsset)
      ? (parseFloat(fill.commission) || 0)
      : 0;

  const EPSILON = 1e-12;
  const trades = [];
  const openBuys = [];

  for (const fill of sorted) {
    const qty = parseFloat(fill.qty);
    const price = parseFloat(fill.price);
    if (!(qty > 0) || !(price > 0)) continue;

    if (fill.isBuyer) {
      openBuys.push({
        id: fill.id,
        qty,
        remaining: qty,
        price,
        time: fill.time,
        commission: quoteCommission(fill)
      });
      continue;
    }

    // Sell fill — close queued buys, oldest first (commissions prorated by
    // the matched fraction of each fill).
    let remaining = qty;
    const sellCommissionPerUnit = quoteCommission(fill) / qty;

    while (remaining > EPSILON && openBuys.length > 0) {
      const lot = openBuys[0];
      const matchedQty = Math.min(remaining, lot.remaining);
      const commission = lot.commission * (matchedQty / lot.qty) + sellCommissionPerUnit * matchedQty;

      trades.push({
        symbol,
        side: 'Long',
        entry_date: new Date(lot.time).toISOString(),
        exit_date: new Date(fill.time).toISOString(),
        entry_price: lot.price,
        exit_price: price,
        quantity: matchedQty,
        pnl: (price - lot.price) * matchedQty - commission,
        commission,
        swap: 0,
        // Stable id derived from the Binance fill ids so dedupe works across
        // syncs (a closing fill can consume several buy lots, so include both).
        broker_trade_id: `binance_${symbol}_${fill.id}_${lot.id}`
      });

      lot.remaining -= matchedQty;
      remaining -= matchedQty;
      if (lot.remaining <= EPSILON) openBuys.shift();
    }
    // Sells with no matching buy (position opened before the fetched window,
    // or acquired via transfer) cannot be priced against an entry — skip.
  }

  return trades;
}

// Real spot balance via signed GET /api/v3/account. We report the sum of
// USDT + USDC (free + locked) as account_balance — valuing every other asset
// would require live market prices, so non-stablecoin holdings are ignored.
async function fetchBinanceBalance(apiKey: string, apiSecret: string): Promise<number> {
  const account = await binanceSignedGet('/api/v3/account', {}, apiKey, apiSecret);
  const stablecoins = ['USDT', 'USDC'];
  return (account.balances || [])
    .filter(b => stablecoins.includes(b.asset))
    .reduce((sum, b) => sum + (parseFloat(b.free) || 0) + (parseFloat(b.locked) || 0), 0);
}

function getInstrumentType(broker_id) {
  const mapping = {
    mt4: 'Forex',
    mt5: 'Forex',
    ctrader: 'Forex',
    binance: 'Crypto',
    coinbase: 'Crypto',
    tradovate: 'Futures'
  };
  return mapping[broker_id] || 'Forex';
}
