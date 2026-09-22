import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { decryptSecret } from '../../shared/brokerSecrets.ts';

// Trade.platform must match the Trade entity enum — map anything else to 'Other'
const PLATFORM_ENUM = ['DXTrade', 'cTrader', 'MatchTrader', 'Rithmic', 'MT4', 'MT5', 'Tradovate', 'TradeLocker', 'NinjaTrader', 'ThinkorSwim', 'TradingView', 'Binance', 'Other'];
const platformEnumSafe = (brokerName) => PLATFORM_ENUM.includes(brokerName) ? brokerName : 'Other';

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
              swap: brokerTrade.swap || existingTrade.swap,
              trade_status: 'closed',
              resolved: true
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
          platform: platformEnumSafe(connection.broker_name),
          instrument_type: getInstrumentType(connection.broker_id),
          broker_connection_id: connection.id,
          broker_trade_id: brokerTrade.broker_trade_id,
          import_source: `${connection.broker_name} API Sync`,
          trade_status: brokerTrade.exit_date ? 'closed' : 'open'
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

    // Update connection with new balance and sync time
    await base44.entities.BrokerConnection.update(connection.id, {
      last_sync: new Date().toISOString(),
      account_balance: brokerData.account_balance,
      account_equity: brokerData.equity,
      status: 'connected'
    });

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
  const { broker_id, server, account_number } = connection;

  // Credentials are encrypted at rest (encryptBrokerKey) — decrypt for API use
  const apiKey = await decryptSecret(connection.api_key || '');
  const apiSecret = await decryptSecret(connection.api_secret || '');

  // Alpaca (paper or live) — real account + recent fills, FIFO-paired into trades
  if (broker_id === 'alpaca') {
    const base = (server || 'https://paper-api.alpaca.markets').replace(/\/$/, '');
    const headers = { 'APCA-API-KEY-ID': apiKey, 'APCA-API-SECRET-KEY': apiSecret };

    const accountRes = await fetch(`${base}/v2/account`, { headers });
    if (!accountRes.ok) {
      const err = await accountRes.text();
      throw new Error(`Alpaca API error (${accountRes.status}): ${err.slice(0, 200)}`);
    }
    const account = await accountRes.json();

    // Collect recent fill activities (newest first; follow the cursor up to 5 pages)
    let fills = [];
    let url = `${base}/v2/activities/activities?direction=desc&page_size=100`;
    for (let page = 0; page < 5 && url; page++) {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Alpaca activities error (${res.status})`);
      }
      const pageItems = await res.json();
      fills = fills.concat((pageItems || []).filter(a => a.activity_type === 'FILL'));
      const link = res.headers.get('Link') || '';
      const m = link.match(/page_token=([^&>]+)/);
      url = m
        ? `${base}/v2/activities/activities?direction=desc&page_size=100&page_token=${m[1]}`
        : null;
    }

    const trades = alpacaFillsToTrades(fills.reverse()); // oldest first

    return {
      trades,
      account_balance: parseFloat(account.cash || 0),
      equity: parseFloat(account.portfolio_value || 0)
    };
  }

  // OANDA — real account + open and closed trades (realized P&L straight from the API)
  if (broker_id === 'oanda') {
    const base = (server || 'https://api-fxpractice.oanda.com').replace(/\/$/, '');
    if (!account_number) {
      throw new Error('OANDA account number (Account ID) is required');
    }
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

    const acctRes = await fetch(`${base}/v3/accounts/${account_number}`, { headers });
    if (!acctRes.ok) {
      const err = await acctRes.text();
      throw new Error(`OANDA API error (${acctRes.status}): ${err.slice(0, 200)}`);
    }
    const acct = (await acctRes.json()).account || {};

    const trades = [];

    // Closed trades
    const closedRes = await fetch(`${base}/v3/accounts/${account_number}/trades?state=closed`, { headers });
    if (closedRes.ok) {
      const closed = (await closedRes.json()).trades || [];
      for (const t of closed) {
        trades.push({
          symbol: t.instrument,
          side: Number(t.initialUnits) > 0 ? 'Long' : 'Short',
          entry_date: t.openTime,
          exit_date: t.closeTime,
          entry_price: parseFloat(t.price),
          exit_price: parseFloat(t.averageClosePrice),
          quantity: Math.abs(parseFloat(t.initialUnits)),
          pnl: parseFloat(t.realizedProfit || 0),
          swap: parseFloat(t.financing || 0),
          commission: 0,
          broker_trade_id: `oanda-${t.id}`,
          trade_status: 'closed'
        });
      }
    }

    // Open trades
    const openRes = await fetch(`${base}/v3/accounts/${account_number}/trades?state=open`, { headers });
    if (openRes.ok) {
      const open = (await openRes.json()).trades || [];
      for (const t of open) {
        trades.push({
          symbol: t.instrument,
          side: Number(t.initialUnits) > 0 ? 'Long' : 'Short',
          entry_date: t.openTime,
          exit_date: null,
          entry_price: parseFloat(t.price),
          exit_price: null,
          quantity: Math.abs(parseFloat(t.currentUnits || t.initialUnits)),
          pnl: parseFloat(t.unrealizedPL || 0),
          swap: 0,
          commission: 0,
          broker_trade_id: `oanda-${t.id}`,
          trade_status: 'open'
        });
      }
    }

    return {
      trades,
      account_balance: parseFloat(acct.balance || 0),
      equity: parseFloat(acct.NAV || acct.balance || 0)
    };
  }

  // For Binance — fills only (kept for backward compatibility)
  if (broker_id === 'binance') {
    const url = 'https://api.binance.com/api/v3/myTrades';
    const timestamp = Date.now();
    const queryString = `symbol=BTCUSDT&timestamp=${timestamp}`;

    const response = await fetch(`${url}?${queryString}`, {
      headers: {
        'X-MBX-APIKEY': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.statusText}`);
    }

    const trades = await response.json();

    // Transform to our format
    return {
      trades: trades.slice(0, 50).map(t => ({
        symbol: t.symbol,
        side: t.isBuyer ? 'Long' : 'Short',
        entry_date: new Date(t.time).toISOString(),
        exit_date: new Date(t.time).toISOString(),
        entry_price: parseFloat(t.price),
        exit_price: parseFloat(t.price),
        quantity: parseFloat(t.qty),
        pnl: parseFloat(t.quoteQty) * (t.isBuyer ? 0.01 : -0.01),
        commission: parseFloat(t.commission),
        swap: 0,
        broker_trade_id: t.id.toString()
      })),
      account_balance: 10000,
      equity: 10000
    };
  }

  // No simulated fallback — brokers without a real API integration fail loudly
  // instead of fabricating fake trades.
  throw new Error(
    `No real sync integration is available for broker '${broker_id}'. ` +
    `Supported: alpaca, oanda. Others: use statement/CSV import.`
  );
}

// FIFO-pair Alpaca fills (oldest → newest) into round-trip trades.
// Unmatched lots become open trades.
function alpacaFillsToTrades(fills) {
  const positions = new Map(); // symbol -> { lots: [...], dir: 'long'|'short'|null }
  const trades = [];

  for (const f of fills) {
    const symbol = f.symbol;
    const price = parseFloat(f.price);
    const qty = Math.abs(parseFloat(f.qty));
    const side = f.side; // 'buy' | 'sell'
    if (!symbol || !price || !qty) continue;

    const pos = positions.get(symbol) || { lots: [], dir: null };
    const incomingDir = side === 'buy' ? 'long' : 'short';
    const fillComm = parseFloat(f.commission || 0);

    if (pos.dir === null || pos.dir === incomingDir) {
      pos.dir = incomingDir;
      pos.lots.push({ price, qty, time: f.transaction_time, id: f.id, commission: fillComm });
    } else {
      // Closing fill — match against open lots FIFO
      let remaining = qty;
      while (remaining > 0 && pos.lots.length > 0) {
        const lot = pos.lots[0];
        const matched = Math.min(lot.qty, remaining);
        const dirSign = pos.dir === 'long' ? 1 : -1;
        const openComm = (lot.commission || 0) * (matched / lot.qty);
        const closeComm = fillComm * (matched / qty);
        const pnl = (price - lot.price) * matched * dirSign - openComm - closeComm;

        trades.push({
          symbol,
          side: pos.dir === 'long' ? 'Long' : 'Short',
          entry_date: new Date(lot.time).toISOString(),
          exit_date: new Date(f.transaction_time).toISOString(),
          entry_price: lot.price,
          exit_price: price,
          quantity: matched,
          pnl,
          commission: openComm + closeComm,
          swap: 0,
          broker_trade_id: `alpaca-${f.id}-${lot.id}`,
          trade_status: 'closed'
        });

        remaining -= matched;
        lot.qty -= matched;
        if (lot.qty <= 1e-9) pos.lots.shift();
      }

      if (remaining > 1e-9) {
        // Reversal — remainder opens a position the other way
        pos.dir = incomingDir;
        pos.lots.push({ price, qty: remaining, time: f.transaction_time, id: f.id, commission: fillComm * (remaining / qty) });
      }
    }
    positions.set(symbol, pos);
  }

  // Leftover lots = still-open positions
  for (const [symbol, pos] of positions) {
    pos.lots.forEach((lot, i) => {
      trades.push({
        symbol,
        side: pos.dir === 'long' ? 'Long' : 'Short',
        entry_date: new Date(lot.time).toISOString(),
        exit_date: null,
        entry_price: lot.price,
        exit_price: null,
        quantity: lot.qty,
        pnl: 0,
        commission: lot.commission || 0,
        swap: 0,
        broker_trade_id: `alpaca-open-${lot.id}-${i}`,
        trade_status: 'open'
      });
    });
  }

  return trades;
}

function getInstrumentType(broker_id) {
  const mapping = {
    mt4: 'Forex',
    mt5: 'Forex',
    ctrader: 'Forex',
    dxtrade: 'Forex',
    oanda: 'Forex',
    tradelocker: 'Forex',
    binance: 'Crypto',
    coinbase: 'Crypto',
    kraken: 'Crypto',
    tradovate: 'Futures',
    alpaca: 'Stocks'
  };
  return mapping[broker_id] || 'Forex';
}