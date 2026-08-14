import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const WEBHOOK_TOKEN = 'hj_update_9x2k_signals_2026';

/**
 * Maps platform trading symbols to Yahoo Finance ticker symbols.
 * Yahoo Finance covers indices, futures, forex, and crypto — all free.
 */
const SYMBOL_MAP = {
  // Index CFDs
  'US30USD':   '^DJI',
  'NAS100USD': '^NDX',
  'US100USD':  '^NDX',
  'SPX500USD': '^GSPC',
  'GER30USD':  '^GDAXI',
  'UK100USD':  '^FTSE',
  // Futures
  'NQ1':  'NQ=F',
  'MNQ1': 'MNQ=F',
  'ES1':  'ES=F',
  'MES1': 'MES=F',
  'YM1':  'YM=F',
  'CL1':  'CL=F',
  'GC1':  'GC=F',
  'NG1':  'NG=F',
  // Crypto
  'BTCUSD':  'BTC-USD',
  'ETHUSD':  'ETH-USD',
  'SOLUSD':  'SOL-USD',
  'XRPUSDT': 'XRP-USD',
  'XRPUSD':  'XRP-USD',
  'BNBUSD':  'BNB-USD',
  'ADAUSD':  'ADA-USD',
  'DOGEUSD': 'DOGE-USD',
  'LTCUSD':  'LTC-USD',
  // Forex
  'GBPUSD': 'GBPUSD=X',
  'EURUSD': 'EURUSD=X',
  'AUDUSD': 'AUDUSD=X',
  'USDCAD': 'USDCAD=X',
  'USDJPY': 'USDJPY=X',
  'NZDUSD': 'NZDUSD=X',
  'USDCHF': 'USDCHF=X',
  'EURJPY': 'EURJPY=X',
  'GBPJPY': 'GBPJPY=X',
  // Metals
  'XAUUSD': 'GC=F',
  'XAGUSD': 'SI=F',
};

function mapSymbol(symbol) {
  if (!symbol) return null;
  const key = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  // Try exact match first, then prefix match
  if (SYMBOL_MAP[key]) return SYMBOL_MAP[key];
  // Try without trailing digits (NQ1! → NQ)
  const base = key.replace(/\d+$/, '');
  if (SYMBOL_MAP[base]) return SYMBOL_MAP[base];
  // Try as-is on Yahoo (works for many US stocks)
  return symbol.toUpperCase();
}

/**
 * Fetch current price for a single Yahoo Finance symbol.
 */
async function fetchPrice(yahooSymbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    // Use regularMarketPrice, fall back to latest candle close
    const price = result.meta?.regularMarketPrice ?? result.indicators?.quote?.[0]?.close?.filter(v => v != null).pop();
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

/**
 * Batch fetch prices for multiple symbols with small concurrency.
 */
async function fetchAllPrices(yahooSymbols) {
  const prices = {};
  // Process in batches of 5 to avoid rate limiting
  for (let i = 0; i < yahooSymbols.length; i += 5) {
    const batch = yahooSymbols.slice(i, i + 5);
    const results = await Promise.all(
      batch.map(async ({ platform, yahoo }) => {
        const price = await fetchPrice(yahoo);
        return { platform, price };
      })
    );
    results.forEach(({ platform, price }) => {
      if (price !== null) prices[platform] = price;
    });
  }
  return prices;
}

/**
 * Check if a signal's TP/SL has been hit given the current price.
 * Returns the new status or null if no hit.
 */
function checkSignalHit(signal, currentPrice) {
  if (!currentPrice || !signal.price) return null;

  const isBuy = signal.action === 'BUY';
  const tps = signal.take_profits && signal.take_profits.length > 0
    ? signal.take_profits
    : (signal.take_profit ? [signal.take_profit] : []);

  const status = signal.status;

  // For BUY: price going up hits TPs, price going down hits SL
  // For SELL: price going down hits TPs, price going up hits SL

  // Check stop loss first (worst case)
  if (signal.stop_loss) {
    const slHit = isBuy ? currentPrice <= signal.stop_loss : currentPrice >= signal.stop_loss;
    if (slHit) return 'stopped_out';
  }

  // Check take profits in order (highest first to capture best achievement)
  if (tps.length > 0) {
    // Already at tp1_hit → check tp2, tp3...
    // Already at tp2_hit → check tp3, full_target...
    let startIdx = 0;
    if (status === 'tp1_hit') startIdx = 1;
    if (status === 'tp2_hit') startIdx = 2;

    for (let i = tps.length - 1; i >= startIdx; i--) {
      const tp = tps[i];
      const tpHit = isBuy ? currentPrice >= tp : currentPrice <= tp;
      if (tpHit) {
        if (i === tps.length - 1) return 'full_target';
        if (i === 0) return 'tp1_hit';
        if (i === 1) return 'tp2_hit';
        return 'full_target';
      }
    }
  }

  return null;
}

const HIT_LABELS = {
  tp1_hit: { label: '🎯 TP1 Hit', priority: 'high' },
  tp2_hit: { label: '🎯 TP2 Hit', priority: 'high' },
  full_target: { label: '🎯 Full Target Hit', priority: 'urgent' },
  stopped_out: { label: '🛑 Stopped Out', priority: 'high' },
};

/**
 * Send in-app + mobile push notifications for signals that hit TP/SL.
 * Mobile push fails gracefully if no native mobile build is configured.
 */
async function sendHitNotifications(base44, userCache, hitEvents) {
  let notified = 0;
  for (const ev of hitEvents) {
    if (!ev.signal.user_email) continue;
    const meta = HIT_LABELS[ev.newStatus];
    if (!meta) continue;

    // Look up user (cached) for push notifications
    let user = userCache[ev.signal.user_email];
    if (user === undefined) {
      try {
        const found = await base44.asServiceRole.entities.User.filter({ email: ev.signal.user_email });
        user = found?.[0] || null;
      } catch {
        user = null;
      }
      userCache[ev.signal.user_email] = user;
    }

    const title = `${meta.label}: ${ev.signal.symbol} ${ev.signal.action}`;
    const hitType = ev.newStatus === 'stopped_out' ? 'SL' : 'TP';
    const message = `Entry: ${ev.signal.price} → ${hitType} hit at ${ev.currentPrice}${ev.signal.provider ? ` | ${ev.signal.provider}` : ''}`;

    // In-app notification (always works)
    try {
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: ev.signal.user_email,
        type: 'trade_alert',
        title,
        message,
        link: `/LiveTradingSignals?signal=${ev.signal.id}`,
        priority: meta.priority,
      });
      notified++;
    } catch (e) {
      console.error(`[monitorSignalTargets] Notification create failed for ${ev.signal.user_email}:`, e.message);
    }

    // Mobile push (native app only; fails gracefully if not configured)
    if (user?.id) {
      try {
        await base44.asServiceRole.integrations.Core.SendPushNotification({
          user_id: user.id,
          title,
          content: message,
          action_label: 'View Signal',
          action_url: `/LiveTradingSignals?signal=${ev.signal.id}`,
        });
      } catch (e) {
        console.log(`[monitorSignalTargets] Push skipped for ${ev.signal.user_email}: ${e.message}`);
      }
    }
  }
  return notified;
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const token = body.token;

    // Auth: token for scheduled/direct calls
    if (!token || token !== WEBHOOK_TOKEN) {
      return Response.json({ error: 'Invalid or missing token' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);

    // 1. Fetch all active (unresolved) signals
    const [newSigs, viewedSigs, executedSigs, tp1Sigs, tp2Sigs] = await Promise.all([
      base44.asServiceRole.entities.Signal.filter({ status: 'new' }, '-created_date', 500),
      base44.asServiceRole.entities.Signal.filter({ status: 'viewed' }, '-created_date', 500),
      base44.asServiceRole.entities.Signal.filter({ status: 'executed' }, '-created_date', 200),
      base44.asServiceRole.entities.Signal.filter({ status: 'tp1_hit' }, '-created_date', 200),
      base44.asServiceRole.entities.Signal.filter({ status: 'tp2_hit' }, '-created_date', 200),
    ]);

    const activeSignals = [...newSigs, ...viewedSigs, ...executedSigs, ...tp1Sigs, ...tp2Sigs];
    console.log(`[monitorSignalTargets] Checking ${activeSignals.length} active signals (new: ${newSigs.length}, viewed: ${viewedSigs.length}, executed: ${executedSigs.length}, tp1: ${tp1Sigs.length}, tp2: ${tp2Sigs.length})`);

    if (activeSignals.length === 0) {
      return Response.json({ success: true, checked: 0, updated: 0, message: 'No active signals to monitor' });
    }

    // 2. Get unique platform symbols and map to Yahoo Finance symbols
    const symbolMap = {};
    activeSignals.forEach(s => {
      if (s.symbol && !symbolMap[s.symbol]) {
        symbolMap[s.symbol] = mapSymbol(s.symbol);
      }
    });

    const uniqueSymbols = Object.entries(symbolMap)
      .filter(([_, yahoo]) => yahoo !== null)
      .map(([platform, yahoo]) => ({ platform, yahoo }));

    console.log(`[monitorSignalTargets] Fetching prices for ${uniqueSymbols.length} unique symbols`);

    // 3. Fetch current prices
    const prices = await fetchAllPrices(uniqueSymbols);
    console.log(`[monitorSignalTargets] Got prices for ${Object.keys(prices).length}/${uniqueSymbols.length} symbols`);

    // 4. Check each signal and update if hit
    const updates = [];
    const hitEvents = [];
    let tp1Count = 0, tp2Count = 0, fullTargetCount = 0, stoppedOutCount = 0;
    const skippedSymbols = [];

    for (const signal of activeSignals) {
      const currentPrice = prices[signal.symbol];
      if (!currentPrice) {
        if (!skippedSymbols.includes(signal.symbol)) {
          skippedSymbols.push(signal.symbol);
        }
        continue;
      }

      const newStatus = checkSignalHit(signal, currentPrice);
      if (!newStatus || newStatus === signal.status) continue;

      const updateData = {
        status: newStatus,
        resolved_at: new Date().toISOString(),
      };

      try {
        await base44.asServiceRole.entities.Signal.update(signal.id, updateData);
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

    // Send notifications for signals that just hit TP/SL
    let notified = 0;
    if (hitEvents.length > 0) {
      const userCache = {};
      notified = await sendHitNotifications(base44, userCache, hitEvents);
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