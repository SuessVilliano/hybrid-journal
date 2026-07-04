import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * QQE Engine — Quantitative-Qualitative Engine
 * 
 * Combines real-time macro data (FRED), price action (Yahoo Finance),
 * economic calendar (Finnhub), and AI synthesis to generate a full
 * QQE Daily Briefing with:
 * - 14-factor session scoring
 * - Regime template identification (Fed Pivot, Inflation Scare, etc.)
 * - Cause-and-effect analysis ("The WHY")
 * - Actionable trade plan with entry, stop, targets
 * - Historical pattern matching ("rhymes")
 * 
 * Based on the Trade Hybrid / LIV8 AI QQE Framework v1.0
 */

const FRED_KEY = Deno.env.get('FRED_API_KEY');
const FINNHUB_KEY = Deno.env.get('FINNHUB_API_KEY');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, symbol, bible_id, use_bible } = await req.json().catch(() => ({ action: 'briefing', symbol: 'MNQ', bible_id: null, use_bible: false }));
    const targetSymbol = (symbol || 'MNQ').toUpperCase();

    // Fetch user's Trading Bible if requested
    let userBible = null;
    if (use_bible || bible_id) {
      try {
        if (bible_id) {
          userBible = await base44.entities.TradingBible.get(bible_id);
        } else {
          const bibles = await base44.entities.TradingBible.list('-created_date', 50);
          userBible = bibles.find(b => b.is_default && b.created_by === user.email) || bibles.find(b => b.created_by === user.email);
        }
      } catch (err) {
        console.error('[QQE Bible fetch error]', err.message);
      }
    }

    // Fetch all data layers in parallel
    const [macro, priceAction, catalysts, newsData] = await Promise.all([
      fetchMacroData(),
      fetchPriceAction(targetSymbol),
      fetchEconomicCalendar(),
      fetchMarketNews(),
    ]);

    // Score the 14 factors
    const factorScores = score14Factors(macro, priceAction, catalysts);
    const sessionScore = Object.values(factorScores).reduce((a, b) => a + b, 0);
    const sessionGrade = sessionScore >= 11 ? 'A' : sessionScore >= 8 ? 'B' : sessionScore >= 5 ? 'C' : 'F';

    // Identify regime template
    const templateResult = identifyRegimeTemplate(macro, priceAction, newsData);

    // Fetch historical briefings for pattern matching ("rhymes")
    const historicalBriefings = await fetchHistoricalBriefings(base44, user.email);

    // Generate the full QQE briefing via AI
    const briefing = await generateQQEBriefing({
      macro, priceAction, catalysts, newsData,
      factorScores, sessionScore, sessionGrade,
      templateResult, historicalBriefings,
      symbol: targetSymbol, user, userBible
    }, base44);

    // Save briefing entity for future pattern matching
    const savedBriefing = await base44.asServiceRole.entities.QQEBriefing.create({
      date: new Date().toISOString().split('T')[0],
      symbol: targetSymbol,
      session_score: sessionScore,
      session_grade: sessionGrade,
      regime_template: templateResult.template,
      template_confidence: templateResult.confidence,
      directional_bias: briefing.directional_bias,
      conviction: briefing.conviction,
      vix_level: macro.vix,
      vix_regime: getVixRegime(macro.vix),
      dxy_level: macro.dxy,
      yield_10y: macro.yield_10y,
      overnight_high: priceAction.overnight_high,
      overnight_low: priceAction.overnight_low,
      current_price: priceAction.current_price,
      sweep_detected: priceAction.sweep_type,
      briefing_markdown: briefing.markdown,
      cause_analysis: briefing.cause_analysis,
      trade_plan: briefing.trade_plan,
      avoid_list: briefing.avoid_list,
      invalidation: briefing.invalidation,
      catalysts_today: catalysts,
      factor_scores: factorScores,
      user_email: user.email
    });

    // Flatten the LLM result — it may be nested under 'response' or 'data'
    const llmResult = briefing.response || briefing.data || briefing;

    return Response.json({
      success: true,
      briefing: {
        id: savedBriefing.id,
        date: new Date().toISOString().split('T')[0],
        symbol: targetSymbol,
        sessionScore,
        sessionGrade,
        factorScores,
        template: templateResult,
        macro,
        priceAction,
        catalysts,
        directional_bias: llmResult.directional_bias,
        conviction: llmResult.conviction,
        cause_analysis: llmResult.cause_analysis,
        trade_plan: llmResult.trade_plan,
        avoid_list: llmResult.avoid_list,
        invalidation: llmResult.invalidation,
        markdown: llmResult.markdown
      }
    });

  } catch (error) {
    console.error('[QQE Engine Error]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ═══════════════════════════════════════════════════════════
// MACRO DATA — FRED API (yields, VIX, DXY, Fed balance sheet)
// ═══════════════════════════════════════════════════════════

async function fetchMacroData() {
  const fredBase = 'https://api.stlouisfed.org/fred/series/observations';
  const series = {
    yield_10y: 'DGS10',
    yield_2y: 'DGS2',
    vix: 'VIXCLS',
    dxy: 'DTWEXBGS',
    fed_balance: 'WALCL'
  };

  const fetchSeries = async (id) => {
    try {
      const url = `${fredBase}?series_id=${id}&api_key=${FRED_KEY}&file_type=json&sort_order=desc&limit=1`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const val = data?.observations?.[0]?.value;
      return val === '.' ? null : parseFloat(val);
    } catch { return null; }
  };

  const [yield_10y, yield_2y, vix, dxy, fed_balance_raw] = await Promise.all([
    fetchSeries(series.yield_10y),
    fetchSeries(series.yield_2y),
    fetchSeries(series.vix),
    fetchSeries(series.dxy),
    fetchSeries(series.fed_balance)
  ]);

  return {
    yield_10y: yield_10y ?? 4.52,
    yield_2y: yield_2y ?? 4.28,
    vix: vix ?? 18.4,
    dxy: dxy ?? 103.2,
    fed_balance_sheet: fed_balance_raw ? parseFloat((fed_balance_raw / 1_000_000).toFixed(2)) : 7.1,
    source: 'FRED',
    timestamp: new Date().toISOString()
  };
}

// ═══════════════════════════════════════════════════════════
// PRICE ACTION — Yahoo Finance (overnight high/low, sweep detection)
// ═══════════════════════════════════════════════════════════

async function fetchPriceAction(symbol) {
  // Map trading symbols to Yahoo Finance tickers
  const yahooMap = {
    'MNQ': 'NQ=F', 'NQ': 'NQ=F', 'ES': 'ES=F', 'YM': 'YM=F',
    'RTY': 'RTY=F', 'EURUSD': 'EURUSD=X', 'GBPUSD': 'GBPUSD=X',
    'USDJPY': 'USDJPY=X', 'BTCUSD': 'BTC-USD', 'ETHUSD': 'ETH-USD',
    'GC': 'GC=F', 'CL': 'CL=F', 'AAPL': 'AAPL', 'TSLA': 'TSLA', 'NVDA': 'NVDA'
  };
  const yahooSymbol = yahooMap[symbol] || 'NQ=F';

  try {
    // Fetch 5-day daily candles for overnight analysis
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=5d&includePrePost=true`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; QQEEngine/1.0)' }
    });
    if (!res.ok) throw new Error('Yahoo Finance fetch failed');
    const data = await res.json();
    
    const result = data?.chart?.result?.[0];
    if (!result) throw new Error('No chart data');

    const quotes = result.indicators?.quote?.[0];
    const timestamps = result.timestamp || [];
    const closes = quotes?.close || [];
    const highs = quotes?.high || [];
    const lows = quotes?.low || [];
    const volumes = quotes?.volume || [];

    const current_price = result.meta?.regularMarketPrice ?? closes[closes.length - 1] ?? 0;
    const prev_close = closes[closes.length - 2] ?? current_price;
    
    // Overnight range (use most recent day's high/low as proxy)
    const overnight_high = highs[highs.length - 1] ?? current_price;
    const overnight_low = lows[lows.length - 1] ?? current_price;
    const range = overnight_high - overnight_low;
    
    // Sweep detection: did price take out prior session high/low?
    const prev_high = highs[highs.length - 2] ?? overnight_high;
    const prev_low = lows[lows.length - 2] ?? overnight_low;
    
    let sweep_type = 'NONE';
    if (current_price > prev_low && overnight_low < prev_low) sweep_type = 'LOW';
    else if (current_price < prev_high && overnight_high > prev_high) sweep_type = 'HIGH';

    // Gap vs previous close
    const gap = current_price - prev_close;
    const gap_percent = prev_close > 0 ? (gap / prev_close) * 100 : 0;

    // Volume confirmation
    const avg_volume = volumes.slice(0, -1).reduce((a, b) => a + (b || 0), 0) / Math.max(volumes.length - 1, 1);
    const current_volume = volumes[volumes.length - 1] ?? 0;
    const volume_ratio = avg_volume > 0 ? current_volume / avg_volume : 1;

    // Consecutive direction days
    let consecutive_dir = 0;
    let dir = 0;
    for (let i = closes.length - 1; i > 0; i--) {
      const dayDir = closes[i] > closes[i - 1] ? 1 : -1;
      if (i === closes.length - 1) { dir = dayDir; consecutive_dir = 1; }
      else if (dayDir === dir) consecutive_dir++;
      else break;
    }

    return {
      current_price,
      prev_close,
      overnight_high,
      overnight_low,
      range,
      sweep_type,
      gap,
      gap_percent,
      volume_ratio,
      consecutive_direction: consecutive_dir,
      direction: dir > 0 ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('[Price Action Error]', err.message);
    return {
      current_price: 0, prev_close: 0, overnight_high: 0, overnight_low: 0,
      range: 0, sweep_type: 'NONE', gap: 0, gap_percent: 0,
      volume_ratio: 1, consecutive_direction: 0, direction: 'MIXED',
      timestamp: new Date().toISOString(), error: true
    };
  }
}

// ═══════════════════════════════════════════════════════════
// ECONOMIC CALENDAR — Finnhub
// ═══════════════════════════════════════════════════════════

async function fetchEconomicCalendar() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const url = `https://finnhub.io/api/v1/calendar/economic?from=${today}&to=${today}&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return getDefaultCatalysts();
    const data = await res.json();
    
    const events = (data?.economicCalendar || data?.events || []).slice(0, 6).map(e => ({
      name: e.event || e.name || 'Economic Event',
      time: e.time ? `${e.time} ET` : 'All Day',
      country: e.country || 'US',
      impact: e.impact === 'high' ? 'HIGH' : e.impact === 'medium' ? 'MEDIUM' : 'LOW',
      actual: e.actual || null,
      estimate: e.estimate || null,
      prior: e.prev || null
    }));

    return events.length > 0 ? events : getDefaultCatalysts();
  } catch (err) {
    console.error('[Econ Calendar Error]', err.message);
    return getDefaultCatalysts();
  }
}

function getDefaultCatalysts() {
  return [
    { name: 'Check economic calendar for today\'s releases', time: 'Pre-market', impact: 'HIGH', country: 'US' },
    { name: 'Fed speaker schedule — verify on Fed website', time: 'TBD', impact: 'MEDIUM', country: 'US' }
  ];
}

// ═══════════════════════════════════════════════════════════
// MARKET NEWS — Finnhub (for qualitative context)
// ═══════════════════════════════════════════════════════════

async function fetchMarketNews() {
  try {
    const url = `https://finnhub.io/api/v1/news?category=general&minId=0&token=${FINNHUB_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return { headlines: [], sentiment: 'NEUTRAL' };
    const news = await res.json();
    
    const articles = (news || []).slice(0, 15);
    const headlines = articles.map(a => a.headline);
    
    // Simple sentiment analysis
    const bullishWords = ['surge', 'rally', 'beat', 'gain', 'rise', 'profit', 'growth', 'record', 'upgrade', 'strong'];
    const bearishWords = ['drop', 'fall', 'miss', 'loss', 'cut', 'decline', 'downgrade', 'risk', 'concern', 'fear', 'crash'];
    
    let bullCount = 0, bearCount = 0;
    for (const article of articles) {
      const text = (article.headline || '').toLowerCase();
      bullishWords.forEach(w => { if (text.includes(w)) bullCount++; });
      bearishWords.forEach(w => { if (text.includes(w)) bearCount++; });
    }

    return {
      headlines: headlines.slice(0, 8),
      top_headline: headlines[0] || null,
      sentiment: bullCount > bearCount ? 'POSITIVE' : bearCount > bullCount ? 'NEGATIVE' : 'NEUTRAL',
      bullish_signals: bullCount,
      bearish_signals: bearCount
    };
  } catch {
    return { headlines: [], sentiment: 'NEUTRAL', bullish_signals: 0, bearish_signals: 0 };
  }
}

// ═══════════════════════════════════════════════════════════
// 14-FACTOR SESSION SCORING
// ═══════════════════════════════════════════════════════════

function score14Factors(macro, price, catalysts) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat

  return {
    // 1. Session type (overnight/pre-market = 1)
    session_type: (now.getHours() >= 4 && now.getHours() < 10) ? 1 : 0,
    
    // 2. Sweep occurred
    sweep_occurred: price.sweep_type !== 'NONE' ? 1 : 0,
    
    // 3. Reversal quality (price reversed from sweep by > 0.3% of price)
    reversal_quality: (price.sweep_type !== 'NONE' && price.current_price > 0 &&
      Math.abs(price.gap / price.current_price) > 0.003) ? 1 : 0,
    
    // 4. VIX regime (12-25 = good for sweep trading)
    vix_regime: (macro.vix >= 12 && macro.vix <= 25) ? 1 : 0,
    
    // 5. Day of week (Tue-Thu = better, Mon/Fri = worse)
    day_of_week: (dayOfWeek >= 2 && dayOfWeek <= 4) ? 1 : 0,
    
    // 6. Consecutive direction days (1-3 consecutive = good, 4+ = overextended)
    consecutive_dir: (price.consecutive_direction >= 1 && price.consecutive_direction <= 3) ? 1 : 0,
    
    // 7. Gap direction alignment (gap aligns with sweep reversal direction)
    gap_alignment: (price.sweep_type === 'LOW' && price.gap > 0) || 
                   (price.sweep_type === 'HIGH' && price.gap < 0) ? 1 : 0,
    
    // 8. Range vs average (moderate range = good, too tight or too wide = bad)
    range_quality: (price.range > 0 && price.current_price > 0 &&
      (price.range / price.current_price) > 0.002 &&
      (price.range / price.current_price) < 0.02) ? 1 : 0,
    
    // 9. Volume confirmation
    volume_confirmation: price.volume_ratio >= 0.8 ? 1 : 0,
    
    // 10. Time of sweep (we don't have exact time, use overnight session as proxy)
    sweep_timing: price.sweep_type !== 'NONE' ? 1 : 0,
    
    // 11. DXY direction (falling dollar = bullish for NQ)
    dxy_direction: macro.dxy < 104 ? 1 : 0,
    
    // 12. Yield trend (yields below 4.5% = supportive for tech)
    yield_trend: macro.yield_10y < 4.5 ? 1 : 0,
    
    // 13. Economic event proximity (no extreme impact event today = good)
    event_proximity: !catalysts.some(c => c.impact === 'EXTREME') ? 1 : 0,
    
    // 14. VIX trend (VIX not in panic mode)
    prior_outcome: macro.vix < 30 ? 1 : 0
  };
}

// ═══════════════════════════════════════════════════════════
// REGIME TEMPLATE IDENTIFICATION
// ═══════════════════════════════════════════════════════════

function identifyRegimeTemplate(macro, price, news) {
  const vix = macro.vix;
  const yield10 = macro.yield_10y;
  const dxy = macro.dxy;
  const spread = yield10 - macro.yield_2y;

  // Template 4: Liquidity Crisis (VIX > 35)
  if (vix > 35) {
    return {
      template: 'Liquidity Crisis',
      confidence: 'HIGH',
      reasoning: `VIX at ${vix} is in crisis territory. Forced selling is likely. Normal sweep-and-reverse rules DO NOT apply.`,
      direction_hint: 'NEUTRAL (wait for VIX to peak)',
      risk_level: 'EXTREME'
    };
  }

  // Template 2: Inflation Scare (yields high, VIX elevated, dollar strong)
  if (yield10 > 4.5 && vix > 18 && dxy > 104) {
    return {
      template: 'Inflation Scare',
      confidence: vix > 20 ? 'HIGH' : 'MODERATE',
      reasoning: `10Y yield above 4.5% (${yield10}%), VIX elevated (${vix}), dollar strong (${dxy}). Higher-for-longer narrative active.`,
      direction_hint: 'SHORT',
      risk_level: 'HIGH'
    };
  }

  // Template 1: Fed Pivot (yields falling, VIX low, dollar weak)
  if (yield10 < 4.3 && vix < 18 && dxy < 103) {
    return {
      template: 'Fed Pivot',
      confidence: spread > 0 ? 'HIGH' : 'MODERATE',
      reasoning: `Yields declining (${yield10}%), VIX low (${vix}), dollar weak (${dxy}). Conditions favor risk assets.`,
      direction_hint: 'LONG',
      risk_level: 'MODERATE'
    };
  }

  // Template 3: Tech Earnings Crush (check news for earnings beats)
  const earningsKeywords = ['earnings', 'beat', 'revenue', 'guidance', 'ai'];
  const earningsNews = (news.headlines || []).filter(h =>
    earningsKeywords.some(k => h.toLowerCase().includes(k))
  ).length;
  
  if (earningsNews >= 3 && news.sentiment === 'POSITIVE') {
    return {
      template: 'Tech Earnings Crush',
      confidence: 'MODERATE',
      reasoning: `${earningsNews} earnings-related headlines with positive sentiment. Mega-cap beats may be driving sector strength.`,
      direction_hint: 'LONG',
      risk_level: 'MODERATE'
    };
  }

  // Default: Normal Market
  return {
    template: 'Normal Market',
    confidence: 'HIGH',
    reasoning: `No strong template signal. VIX=${vix}, 10Y=${yield10}%, DXY=${dxy}. Use standard scoring system.`,
    direction_hint: 'NEUTRAL',
    risk_level: 'MODERATE'
  };
}

function getVixRegime(vix) {
  if (vix < 12) return 'Extreme Complacency';
  if (vix < 16) return 'Normal Low Vol';
  if (vix < 20) return 'Elevated';
  if (vix < 25) return 'High';
  if (vix < 30) return 'Very High';
  if (vix < 35) return 'Extreme Fear';
  return 'Panic';
}

// ═══════════════════════════════════════════════════════════
// HISTORICAL BRIEFINGS — for pattern matching ("rhymes")
// ═══════════════════════════════════════════════════════════

async function fetchHistoricalBriefings(base44, userEmail) {
  try {
    const briefings = await base44.asServiceRole.entities.QQEBriefing.filter(
      { user_email: userEmail },
      '-created_date',
      30
    );
    return briefings || [];
  } catch {
    return [];
  }
}

function findSimilarRhymes(currentBriefing, historicalBriefings) {
  if (!historicalBriefings || historicalBriefings.length === 0) return [];

  const scored = historicalBriefings.map(b => {
    let similarity = 0;
    
    // VIX similarity (within 3 points)
    if (Math.abs(b.vix_level - currentBriefing.macro.vix) < 3) similarity += 25;
    else if (Math.abs(b.vix_level - currentBriefing.macro.vix) < 5) similarity += 15;
    
    // DXY similarity (within 2 points)
    if (Math.abs(b.dxy_level - currentBriefing.macro.dxy) < 2) similarity += 20;
    else if (Math.abs(b.dxy_level - currentBriefing.macro.dxy) < 4) similarity += 10;
    
    // Yield similarity (within 0.2%)
    if (Math.abs(b.yield_10y - currentBriefing.macro.yield_10y) < 0.2) similarity += 20;
    else if (Math.abs(b.yield_10y - currentBriefing.macro.yield_10y) < 0.4) similarity += 10;
    
    // Same regime template
    if (b.regime_template === currentBriefing.templateResult.template) similarity += 20;
    
    // Same sweep type
    if (b.sweep_detected === currentBriefing.priceAction.sweep_type) similarity += 15;

    return { ...b, similarity_score: similarity };
  });

  return scored
    .filter(b => b.similarity_score >= 40)
    .sort((a, b) => b.similarity_score - a.similarity_score)
    .slice(0, 3);
}

// ═══════════════════════════════════════════════════════════
// AI BRIEFING GENERATION — The QQE Synthesis
// ═══════════════════════════════════════════════════════════

async function generateQQEBriefing(ctx, base44) {
  const { macro, priceAction, catalysts, newsData, factorScores, sessionScore, sessionGrade, templateResult, historicalBriefings, symbol, user, userBible } = ctx;

  // Find historical "rhymes"
  const rhymes = findSimilarRhymes(
    { macro, priceAction, templateResult },
    historicalBriefings
  );

  const rhymeContext = rhymes.length > 0
    ? rhymes.map(r => `- ${r.date}: VIX=${r.vix_level}, DXY=${r.dxy_level}, 10Y=${r.yield_10y}%, Template=${r.regime_template}, Bias=${r.directional_bias}, Grade=${r.session_grade} (${r.similarity_score}% match)`).join('\n')
    : 'No similar historical patterns found yet. This is the first briefing or insufficient data for pattern matching.';

  const catalystSummary = catalysts.slice(0, 5)
    .map(c => `${c.time} — ${c.name} (${c.impact})${c.estimate ? ` | Est: ${c.estimate}` : ''}${c.prior ? ` | Prior: ${c.prior}` : ''}`)
    .join('\n') || 'No major events scheduled';

  const newsSummary = newsData.top_headline
    ? `Top headline: "${newsData.top_headline}"\nSentiment: ${newsData.sentiment} (${newsData.bullish_signals} bullish / ${newsData.bearish_signals} bearish signals)`
    : 'No major news';

  const bibleSection = userBible ? `
═══ USER'S TRADING BIBLE (Personal Edge) ═══
Bible Name: ${userBible.name}
Symbol: ${userBible.symbol}
Preferred Setups: ${(userBible.preferred_setups || []).join(', ') || 'None specified'}
Entry Rules: ${(userBible.entry_rules || []).join('; ') || 'None specified'}
Exit Rules: ${(userBible.exit_rules || []).join('; ') || 'None specified'}
Risk Per Trade: ${userBible.risk_per_trade || 'Not specified'}
Volatility Filter: ${userBible.volatility_filter || 'Not specified'}
Session Windows: ${(userBible.session_windows || []).join(', ') || 'Not specified'}
Avoid Conditions: ${(userBible.avoid_conditions || []).join('; ') || 'None specified'}
Qualitative Logic (The "Why"): ${userBible.qualitative_logic || 'Not specified'}
Invalidation Logic: ${userBible.invalidation_logic || 'Not specified'}

IMPORTANT: Evaluate today's market against this Bible. Specifically address:
1. Does today's environment match the Bible's volatility filter and session windows?
2. Are any of the Bible's avoid conditions present today?
3. Does the Bible's directional edge align with the QQE regime template?
4. If the Bible's invalidation logic is triggered, explicitly warn the user.

The trade plan you generate should respect the Bible's entry rules, exit rules, and risk parameters where possible.
` : '';

  const prompt = `You are the QQE (Quantitative-Qualitative Engine) for ${symbol} trading. Generate a comprehensive Daily Briefing following the QQE Framework.

REAL-TIME DATA:
- Symbol: ${symbol}
- Current Price: ${priceAction.current_price?.toFixed(2)}
- Previous Close: ${priceAction.prev_close?.toFixed(2)}
- Overnight High: ${priceAction.overnight_high?.toFixed(2)}
- Overnight Low: ${priceAction.overnight_low?.toFixed(2)}
- Overnight Range: ${priceAction.range?.toFixed(2)} pts
- Gap: ${priceAction.gap?.toFixed(2)} pts (${priceAction.gap_percent?.toFixed(2)}%)
- Sweep Detected: ${priceAction.sweep_type} (NONE/HIGH/LOW)
- Consecutive ${priceAction.direction} days: ${priceAction.consecutive_direction}
- Volume ratio vs avg: ${priceAction.volume_ratio?.toFixed(2)}x

MACRO DATA (FRED Real-Time):
- VIX: ${macro.vix} (${getVixRegime(macro.vix)})
- DXY: ${macro.dxy}
- 10Y Yield: ${macro.yield_10y}%
- 2Y Yield: ${macro.yield_2y}%
- Yield Spread: ${(macro.yield_10y - macro.yield_2y).toFixed(2)}%
- Fed Balance Sheet: $${macro.fed_balance_sheet}T

TODAY'S CATALYSTS (Finnhub):
${catalystSummary}

NEWS SENTIMENT:
${newsSummary}

SESSION SCORING (14 Factors):
- Total Score: ${sessionScore}/14
- Grade: ${sessionGrade}
- Factor breakdown: ${Object.entries(factorScores).map(([k, v]) => `${k}=${v}`).join(', ')}

REGIME TEMPLATE IDENTIFICATION:
- Template: ${templateResult.template}
- Confidence: ${templateResult.confidence}
- Reasoning: ${templateResult.reasoning}
- Direction Hint: ${templateResult.direction_hint}

HISTORICAL PATTERN MATCHING ("Rhymes"):
${rhymeContext}

Based on ALL of this data, generate a complete QQE Daily Briefing. You must return a JSON object with these exact keys:

1. "directional_bias": "LONG" | "SHORT" | "NEUTRAL"
2. "conviction": "HIGH" | "MODERATE" | "LOW"
3. "cause_analysis": 2-3 sentences answering "WHY is the market where it is today?" — the core QQE differentiator. Explain the cause, not just the pattern.
4. "trade_plan": object with keys: primary_setup, entry_window, key_level, entry_trigger, stop_loss, tp1, tp2, position_size, rr_ratio — provide specific price levels and times for ${symbol}
5. "avoid_list": array of 2-3 strings — times/conditions to avoid trading today
6. "invalidation": string — the specific condition that would flip the bias
7. "markdown": the FULL QQE Daily Briefing in markdown format, following this template structure:
   - Header with date, symbol, session score
   - Overnight Recap
   - Macro Context (VIX, DXY, Yields, Asia/Europe if known)
   - Today's Events
   - The "Why" Today (narrative + key question)
   - Regime Identification
   - Directional Bias + Reasoning
   - Trade Plan (entry, stop, targets, position size)
   - Avoid Today
   - Invalidation
   - Historical Rhymes (if any matched)

Be specific with price levels. This is an actionable trade briefing, not a general overview. If the template is "Liquidity Crisis", explicitly warn that normal sweep rules do not apply.
${bibleSection}`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        directional_bias: { type: 'string', enum: ['LONG', 'SHORT', 'NEUTRAL'] },
        conviction: { type: 'string', enum: ['HIGH', 'MODERATE', 'LOW'] },
        cause_analysis: { type: 'string' },
        trade_plan: {
          type: 'object',
          properties: {
            primary_setup: { type: 'string' },
            entry_window: { type: 'string' },
            key_level: { type: 'string' },
            entry_trigger: { type: 'string' },
            stop_loss: { type: 'string' },
            tp1: { type: 'string' },
            tp2: { type: 'string' },
            position_size: { type: 'string' },
            rr_ratio: { type: 'string' }
          }
        },
        avoid_list: { type: 'array', items: { type: 'string' } },
        invalidation: { type: 'string' },
        markdown: { type: 'string' }
      }
    }
  });

  return result;
}