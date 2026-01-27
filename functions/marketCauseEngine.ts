import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Market Cause Engine - Core Intelligence
 * 
 * Calculates real-time market causality scores and regime
 * This function can be invoked by:
 * - Frontend UI components
 * - AI chatbot for real-time market insights
 * - Trade entry forms to capture market context
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, symbol } = await req.json();
    const targetSymbol = symbol || 'ES';

    // Fetch real-time market data for specific symbol
    const marketData = await fetchMarketData(targetSymbol);
    
    // Calculate all causality scores for this symbol
    const scores = calculateCauseScores(marketData, targetSymbol);
    
    // Generate analysis based on action
    let analysis = null;
    if (action === 'analyze') {
      analysis = generateAnalysis(scores, marketData, targetSymbol);
    }

    // Save snapshot to database
    await base44.asServiceRole.entities.MarketSnapshot.create({
      regime: scores.regime,
      composite_score: scores.composite,
      macro_score: scores.macro,
      positioning_score: scores.positioning,
      catalyst_score: scores.catalyst,
      sector_score: scores.sector,
      primary_causes: analysis?.causes || [],
      confirmation_signals: analysis?.confirmation || [],
      invalidation_signals: analysis?.invalidation || [],
      key_levels: analysis?.key_levels || [],
      next_catalysts: marketData.catalysts,
      macro_data: marketData.macro,
      positioning_data: marketData.positioning
    });

    return Response.json({
      scores,
      analysis,
      marketData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// ═══════════════════════════════════════════════════════════
// DATA FETCHING
// ═══════════════════════════════════════════════════════════

async function fetchMarketData(symbol) {
  // Fetch real-time data from multiple sources
  // In production, connect to FRED API, Yahoo Finance, etc.
  
  // For now, using simulated data structure
  // TODO: Connect to real APIs with API keys
  
  const macro = await fetchMacroData();
  const positioning = await fetchPositioningData(symbol);
  const catalysts = await fetchCatalystCalendar(symbol);
  
  return { macro, positioning, catalysts, symbol };
}

async function fetchMacroData() {
  // TODO: Connect to FRED API and Yahoo Finance
  // For now, returning structure with simulated data
  
  return {
    yield_10y: 4.52,
    yield_2y: 4.28,
    dxy: 103.24,
    fed_balance_sheet: 7.2,
    vix: 18.4,
    timestamp: new Date().toISOString()
  };
}

async function fetchPositioningData(symbol) {
  // TODO: Connect to CFTC COT reports and options data
  // Symbol-specific positioning data
  
  const symbolData = {
    'ES': { net_position: -2.3, dealer_gamma: 'negative', put_call_ratio: 1.24, cot_net_long: -15420 },
    'NQ': { net_position: -1.8, dealer_gamma: 'negative', put_call_ratio: 1.15, cot_net_long: -12300 },
    'EURUSD': { net_position: 1.2, dealer_gamma: 'positive', put_call_ratio: 0.95, cot_net_long: 8200 },
    'BTCUSD': { net_position: -0.5, dealer_gamma: 'negative', put_call_ratio: 1.45, cot_net_long: -5600 },
    'GC': { net_position: 2.1, dealer_gamma: 'positive', put_call_ratio: 0.88, cot_net_long: 11500 }
  };
  
  return symbolData[symbol] || { net_position: 0, dealer_gamma: 'neutral', put_call_ratio: 1.0, cot_net_long: 0 };
}

async function fetchCatalystCalendar(symbol) {
  // TODO: Connect to economic calendar API
  // Symbol-specific catalysts
  
  const baseCatalysts = [
    { name: 'CPI', time: '14h 23m', impact: 'EXTREME', expected_volatility: 1.2 },
    { name: 'FOMC Decision', time: '3d', impact: 'HIGH', expected_volatility: 0.8 },
    { name: 'Treasury Auction', time: '1d', impact: 'MEDIUM', expected_volatility: 0.3 },
    { name: 'Retail Sales', time: '5d', impact: 'MEDIUM', expected_volatility: 0.4 }
  ];
  
  // Add symbol-specific catalysts
  if (symbol.includes('USD') || symbol === 'ES' || symbol === 'NQ') {
    return baseCatalysts;
  } else if (symbol === 'BTCUSD' || symbol === 'ETHUSD') {
    return [
      { name: 'Bitcoin ETF Decision', time: '2d', impact: 'HIGH', expected_volatility: 1.5 },
      ...baseCatalysts.slice(0, 2)
    ];
  } else if (symbol === 'GC') {
    return [
      { name: 'FOMC Decision', time: '3d', impact: 'EXTREME', expected_volatility: 1.0 },
      { name: 'USD Data', time: '1d', impact: 'HIGH', expected_volatility: 0.6 }
    ];
  }
  
  return baseCatalysts;
}

// ═══════════════════════════════════════════════════════════
// SCORING LOGIC
// ═══════════════════════════════════════════════════════════

function calculateCauseScores(marketData, symbol) {
  const macro = scoreMacroPressure(marketData.macro, symbol);
  const positioning = scorePositioning(marketData.positioning);
  const catalyst = scoreCatalystRisk(marketData.catalysts);
  const sector = scoreSectorSensitivity(marketData.macro, symbol);
  
  const composite = (macro + positioning + catalyst + sector) / 4;
  
  // Determine regime
  let regime, confidence;
  if (composite >= 75) {
    regime = 'RISK-OFF';
    confidence = 'EXTREME';
  } else if (composite >= 60) {
    regime = 'CAUTION';
    confidence = 'HIGH';
  } else if (composite >= 40) {
    regime = 'NEUTRAL';
    confidence = 'MEDIUM';
  } else {
    regime = 'RISK-ON';
    confidence = 'HIGH';
  }
  
  return { macro, positioning, catalyst, sector, composite, regime, confidence };
}

function scoreMacroPressure(macro, symbol) {
  let score = 50;
  
  // Symbol-specific sensitivities
  const isCrypto = symbol.includes('BTC') || symbol.includes('ETH');
  const isGold = symbol === 'GC';
  const isTech = symbol === 'NQ' || ['AAPL', 'TSLA', 'NVDA'].includes(symbol);
  
  // Rate pressure (more impact on tech/growth)
  const rateMultiplier = isTech ? 1.5 : isCrypto ? 1.3 : 1.0;
  if (macro.yield_10y > 4.5) score += 10 * rateMultiplier;
  if (macro.yield_10y > 4.75) score += 10 * rateMultiplier;
  
  // Yield curve
  const curveSpread = macro.yield_10y - macro.yield_2y;
  if (curveSpread < 0) score += 15;
  
  // Dollar strength (inverse for gold, commodities, crypto)
  const dollarMultiplier = isGold ? -1.5 : isCrypto ? -1.2 : 1.0;
  if (macro.dxy > 103) score += 10 * dollarMultiplier;
  if (macro.dxy > 105) score += 10 * dollarMultiplier;
  
  // VIX fear gauge
  if (macro.vix > 20) score += 10;
  if (macro.vix > 25) score += 15;
  
  // Fed balance sheet
  if (macro.fed_balance_sheet < 7.5) score += 7;
  
  return Math.min(100, Math.max(0, score));
}

function scorePositioning(positioning) {
  let score = 50;
  
  // Net positioning
  if (positioning.es_net_position < -2.0) score -= 15; // Heavy shorts = squeeze risk
  else if (positioning.es_net_position > 2.0) score += 15; // Heavy longs = downside risk
  
  // Dealer gamma
  if (positioning.dealer_gamma === 'negative') score += 15;
  
  // Put/Call ratio
  if (positioning.put_call_ratio > 1.2) score += 10; // Defensive
  else if (positioning.put_call_ratio < 0.8) score -= 10; // Complacent
  
  // COT positioning
  if (positioning.cot_net_long < -10000) score -= 10;
  else if (positioning.cot_net_long > 10000) score += 10;
  
  return Math.min(100, Math.max(0, score));
}

function scoreCatalystRisk(catalysts) {
  let score = 50;
  
  for (const catalyst of catalysts) {
    if (isNearTerm(catalyst.time)) {
      if (catalyst.impact === 'EXTREME') score += 25;
      else if (catalyst.impact === 'HIGH') score += 15;
      else if (catalyst.impact === 'MEDIUM') score += 8;
    }
  }
  
  return Math.min(100, score);
}

function scoreSectorSensitivity(macro, symbol) {
  let score = 50;
  
  const isCrypto = symbol.includes('BTC') || symbol.includes('ETH');
  const isGold = symbol === 'GC';
  const isTech = symbol === 'NQ' || ['AAPL', 'TSLA', 'NVDA'].includes(symbol);
  const isEnergy = symbol === 'CL';
  
  // Tech sensitivity to rates (NQ, tech stocks)
  if (isTech && macro.yield_10y > 4.5) score += 20;
  
  // Gold benefits from dollar weakness
  if (isGold && macro.dxy > 103) score -= 15;
  
  // Crypto correlates with risk-on/tech
  if (isCrypto) {
    if (macro.yield_10y > 4.5) score += 18;
    if (macro.vix > 20) score += 12;
  }
  
  // Energy sensitivity
  if (isEnergy && macro.dxy > 103) score += 8;
  
  // Financials benefit from steeper curve
  const curve = macro.yield_10y - macro.yield_2y;
  if (curve > 0.3) score -= 5;
  
  return Math.min(100, Math.max(0, score));
}

function isNearTerm(timeStr) {
  if (timeStr.includes('h') || timeStr.includes('m')) return true;
  if (timeStr.includes('d')) {
    const days = parseInt(timeStr);
    return days <= 2;
  }
  return false;
}

// ═══════════════════════════════════════════════════════════
// ANALYSIS GENERATION
// ═══════════════════════════════════════════════════════════

function generateAnalysis(scores, marketData, symbol) {
  const isCrypto = symbol.includes('BTC') || symbol.includes('ETH');
  const isGold = symbol === 'GC';
  const isTech = symbol === 'NQ' || ['AAPL', 'TSLA', 'NVDA'].includes(symbol);
  
  const causes = [
    `${symbol} - Rate environment: 10Y yield at ${marketData.macro.yield_10y}% ${isTech || isCrypto ? '(high pressure on growth assets)' : ''}`,
    `Dollar at ${marketData.macro.dxy}: ${isGold || isCrypto ? 'creating headwinds' : 'supporting USD pairs'}`,
    `Dealer gamma ${marketData.positioning.dealer_gamma}: ${marketData.positioning.dealer_gamma === 'negative' ? 'amplifying volatility in both directions' : 'dampening moves'}`,
    `${symbol} positioning: Net ${marketData.positioning.net_position > 0 ? 'long' : 'short'} ${Math.abs(marketData.positioning.net_position)}B`,
    `VIX at ${marketData.macro.vix}: ${marketData.macro.vix > 20 ? 'elevated fear environment' : 'calm conditions'}`
  ];
  
  const confirmation = [
    isTech ? `10Y yield breaking 4.60% → accelerates selling in ${symbol}` : `Momentum continuation in current direction`,
    `Monitor positioning shifts and hedging flows`,
    `Watch for ${marketData.catalysts[0]?.name} catalyst impact`
  ];
  
  const invalidation = [
    `Yield reversal below 4.45% would ease ${isTech || isCrypto ? 'rate pressure' : 'macro headwinds'}`,
    isGold ? `Dollar weakness (DXY < 102) would be bullish for ${symbol}` : `Dollar strength would shift sentiment`,
    `Regime change to ${scores.regime === 'RISK-OFF' ? 'RISK-ON' : 'RISK-OFF'} invalidates current bias`
  ];
  
  // Symbol-specific key levels (simulated - in production, calculate from actual price data)
  const keyLevels = getKeyLevels(symbol);
  
  return {
    causes,
    confirmation,
    invalidation,
    key_levels: keyLevels
  };
}

function getKeyLevels(symbol) {
  const levels = {
    'ES': ['4485', '4460', '4420'],
    'NQ': ['16800', '16500', '16200'],
    'EURUSD': ['1.0850', '1.0800', '1.0750'],
    'BTCUSD': ['42000', '40000', '38000'],
    'GC': ['2050', '2020', '2000'],
    'GBPUSD': ['1.2750', '1.2700', '1.2650'],
    'USDJPY': ['149.50', '148.00', '146.50']
  };
  
  return levels[symbol] || ['Check charts for levels'];
}