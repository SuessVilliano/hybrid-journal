// Shared signal-monitoring helpers used by monitorSignalTargets and checkNewSignal.
// Extracted here so both functions use identical hit-detection + notification logic.

export const SYMBOL_MAP = {
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

export function mapSymbol(symbol) {
  if (!symbol) return null;
  const key = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (SYMBOL_MAP[key]) return SYMBOL_MAP[key];
  const base = key.replace(/\d+$/, '');
  if (SYMBOL_MAP[base]) return SYMBOL_MAP[base];
  return symbol.toUpperCase();
}

export async function fetchPrice(yahooSymbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1m&range=1d`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const price = result.meta?.regularMarketPrice ?? result.indicators?.quote?.[0]?.close?.filter(v => v != null).pop();
    return typeof price === 'number' ? price : null;
  } catch {
    return null;
  }
}

export async function fetchAllPrices(yahooSymbols) {
  const prices = {};
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
export function checkSignalHit(signal, currentPrice) {
  if (!currentPrice || !signal.price) return null;

  const isBuy = signal.action === 'BUY';
  const tps = signal.take_profits && signal.take_profits.length > 0
    ? signal.take_profits
    : (signal.take_profit ? [signal.take_profit] : []);

  const status = signal.status;

  if (signal.stop_loss) {
    const slHit = isBuy ? currentPrice <= signal.stop_loss : currentPrice >= signal.stop_loss;
    if (slHit) return 'stopped_out';
  }

  if (tps.length > 0) {
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

export const HIT_LABELS = {
  tp1_hit: { label: '🎯 TP1 Hit', priority: 'high' },
  tp2_hit: { label: '🎯 TP2 Hit', priority: 'high' },
  full_target: { label: '🎯 Full Target Hit', priority: 'urgent' },
  stopped_out: { label: '🛑 Stopped Out', priority: 'high' },
};

/**
 * Send in-app + mobile push notifications for signals that hit TP/SL.
 * Mobile push fails gracefully if no native mobile build is configured.
 */
export async function sendHitNotifications(base44, userCache, hitEvents) {
  let notified = 0;
  for (const ev of hitEvents) {
    if (!ev.signal.user_email) continue;
    const meta = HIT_LABELS[ev.newStatus];
    if (!meta) continue;

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
      console.error(`[signalMonitor] Notification create failed for ${ev.signal.user_email}:`, e.message);
    }

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
        console.log(`[signalMonitor] Push skipped for ${ev.signal.user_email}: ${e.message}`);
      }
    }
  }
  return notified;
}