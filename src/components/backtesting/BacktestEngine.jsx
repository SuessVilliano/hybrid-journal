// Advanced Backtesting Engine
import { base44 } from '@/api/base44Client';

// Generate simulated price data (AI-generated synthetic OHLCV, NOT real market history)
export async function fetchHistoricalData(symbol, startDate, endDate, timeframe = '1h') {
  try {
    const prompt = `Fetch historical OHLCV data for ${symbol} from ${startDate} to ${endDate} with ${timeframe} timeframe.
    Return a JSON array with objects containing: timestamp, open, high, low, close, volume.
    Generate realistic price movements with proper trends and volatility.`;
    
    const schema = {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              timestamp: { type: "string" },
              open: { type: "number" },
              high: { type: "number" },
              low: { type: "number" },
              close: { type: "number" },
              volume: { type: "number" }
            }
          }
        }
      }
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      response_json_schema: schema
    });

    return result.data || [];
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
}

// Calculate technical indicators
export function calculateIndicators(data, indicators) {
  const results = { ...data };
  
  indicators.forEach(indicator => {
    switch (indicator.type) {
      case 'SMA':
        results[`SMA_${indicator.period}`] = calculateSMA(data.close, indicator.period);
        break;
      case 'EMA':
        results[`EMA_${indicator.period}`] = calculateEMA(data.close, indicator.period);
        break;
      case 'RSI':
        results[`RSI_${indicator.period}`] = calculateRSI(data.close, indicator.period);
        break;
      case 'MACD':
        const macd = calculateMACD(data.close, indicator.fast, indicator.slow, indicator.signal);
        results.MACD = macd.macd;
        results.MACD_Signal = macd.signal;
        results.MACD_Histogram = macd.histogram;
        break;
      case 'Bollinger':
        const bb = calculateBollingerBands(data.close, indicator.period, indicator.std);
        results.BB_Upper = bb.upper;
        results.BB_Middle = bb.middle;
        results.BB_Lower = bb.lower;
        break;
      case 'ATR':
        results[`ATR_${indicator.period}`] = calculateATR(data, indicator.period);
        break;
    }
  });
  
  return results;
}

// Simple Moving Average
function calculateSMA(prices, period) {
  const sma = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

// Exponential Moving Average
function calculateEMA(prices, period) {
  const ema = [];
  const multiplier = 2 / (period + 1);
  
  let emaValue = prices[0];
  ema.push(emaValue);
  
  for (let i = 1; i < prices.length; i++) {
    emaValue = (prices[i] - emaValue) * multiplier + emaValue;
    ema.push(emaValue);
  }
  return ema;
}

// Relative Strength Index
function calculateRSI(prices, period = 14) {
  const rsi = [];
  const changes = [];
  
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  for (let i = 0; i < changes.length; i++) {
    if (i < period) {
      rsi.push(null);
    } else {
      const gains = changes.slice(i - period, i).filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
      const losses = Math.abs(changes.slice(i - period, i).filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
      const rs = gains / (losses || 0.0001);
      rsi.push(100 - (100 / (1 + rs)));
    }
  }
  
  return [null, ...rsi];
}

// MACD
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
  
  return { macd: macdLine, signal: signalLine, histogram };
}

// Bollinger Bands
function calculateBollingerBands(prices, period = 20, stdDev = 2) {
  const sma = calculateSMA(prices, period);
  const upper = [];
  const lower = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }
  
  return { upper, middle: sma, lower };
}

// Average True Range
function calculateATR(data, period = 14) {
  const tr = [];
  
  for (let i = 1; i < data.close.length; i++) {
    const high = data.high[i];
    const low = data.low[i];
    const prevClose = data.close[i - 1];
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    tr.push(Math.max(tr1, tr2, tr3));
  }
  
  return [null, ...calculateSMA(tr, period)];
}

// --- Safe condition expression evaluator ---
// Supports: numbers, identifiers (looked up in the context), parentheses,
// unary - and !, * /, + -, comparisons (> < >= <= == !=) and && ||.
// Anything else (function calls, assignment, brackets, semicolons, quotes)
// is rejected as a syntax error. Conditions are NEVER executed as JavaScript.

function tokenizeCondition(input) {
  const tokens = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let num = '';
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i];
        i++;
      }
      if (!/^(\d+(\.\d+)?|\.\d+)$/.test(num)) {
        throw new Error(`invalid number "${num}"`);
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }

    if (/[A-Za-z_]/.test(ch)) {
      let name = '';
      while (i < input.length && /[A-Za-z0-9_]/.test(input[i])) {
        name += input[i];
        i++;
      }
      tokens.push({ type: 'identifier', value: name });
      continue;
    }

    const three = input.slice(i, i + 3);
    if (three === '===' || three === '!==') {
      tokens.push({ type: 'op', value: three.slice(0, 2) });
      i += 3;
      continue;
    }

    const two = input.slice(i, i + 2);
    if (['==', '!=', '>=', '<=', '&&', '||'].includes(two)) {
      tokens.push({ type: 'op', value: two });
      i += 2;
      continue;
    }

    if ('><+-*/!()'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i++;
      continue;
    }

    throw new Error(`unexpected character "${ch}"`);
  }

  return tokens;
}

function parseConditionTokens(tokens) {
  let pos = 0;

  const peek = () => tokens[pos];
  const matchOp = (...ops) => {
    const token = tokens[pos];
    if (token && token.type === 'op' && ops.includes(token.value)) {
      pos++;
      return token.value;
    }
    return null;
  };

  function parsePrimary() {
    const token = peek();
    if (!token) {
      throw new Error('unexpected end of expression');
    }
    if (token.type === 'number') {
      pos++;
      return { type: 'number', value: token.value };
    }
    if (token.type === 'identifier') {
      pos++;
      return { type: 'identifier', name: token.value };
    }
    if (matchOp('(')) {
      const expr = parseOr();
      if (!matchOp(')')) {
        throw new Error('missing closing parenthesis');
      }
      return expr;
    }
    throw new Error(`unexpected token "${token.value}"`);
  }

  function parseUnary() {
    const op = matchOp('-', '!');
    if (op) {
      return { type: 'unary', op, arg: parseUnary() };
    }
    return parsePrimary();
  }

  function parseBinary(parseNext, ...ops) {
    let left = parseNext();
    let op;
    while ((op = matchOp(...ops))) {
      left = { type: 'binary', op, left, right: parseNext() };
    }
    return left;
  }

  const parseMultiplicative = () => parseBinary(parseUnary, '*', '/');
  const parseAdditive = () => parseBinary(parseMultiplicative, '+', '-');
  const parseComparison = () => parseBinary(parseAdditive, '>', '<', '>=', '<=');
  const parseEquality = () => parseBinary(parseComparison, '==', '!=');
  const parseAnd = () => parseBinary(parseEquality, '&&');
  const parseOr = () => parseBinary(parseAnd, '||');

  const ast = parseOr();
  if (pos < tokens.length) {
    throw new Error(`unexpected token "${tokens[pos].value}"`);
  }
  return ast;
}

function collectIdentifiers(node, identifiers) {
  if (node.type === 'identifier') {
    identifiers.add(node.name);
  } else if (node.type === 'unary') {
    collectIdentifiers(node.arg, identifiers);
  } else if (node.type === 'binary') {
    collectIdentifiers(node.left, identifiers);
    collectIdentifiers(node.right, identifiers);
  }
}

function evaluateAst(node, context) {
  switch (node.type) {
    case 'number':
      return node.value;
    case 'identifier':
      return context[node.name];
    case 'unary':
      return node.op === '-' ? -evaluateAst(node.arg, context) : !evaluateAst(node.arg, context);
    case 'binary': {
      const left = evaluateAst(node.left, context);
      switch (node.op) {
        case '&&': return Boolean(left) && Boolean(evaluateAst(node.right, context));
        case '||': return Boolean(left) || Boolean(evaluateAst(node.right, context));
      }
      const right = evaluateAst(node.right, context);
      switch (node.op) {
        case '*': return left * right;
        case '/': return left / right;
        case '+': return left + right;
        case '-': return left - right;
        case '>': return left > right;
        case '<': return left < right;
        case '>=': return left >= right;
        case '<=': return left <= right;
        case '==': return left === right;
        case '!=': return left !== right;
      }
    }
  }
  throw new Error('invalid expression node');
}

const conditionCache = new Map();
const unknownIdentifierWarnings = new Set();

function parseCondition(condition) {
  if (conditionCache.has(condition)) {
    return conditionCache.get(condition);
  }
  const ast = parseConditionTokens(tokenizeCondition(condition));
  const identifiers = new Set();
  collectIdentifiers(ast, identifiers);
  const parsed = { ast, identifiers };
  conditionCache.set(condition, parsed);
  return parsed;
}

// Evaluate entry condition
function evaluateCondition(condition, candle, indicators, position) {
  if (!condition || !String(condition).trim()) return false;

  const context = {
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
    ...indicators,
    position
  };

  let parsed;
  try {
    parsed = parseCondition(condition);
  } catch (error) {
    throw new Error(`Invalid strategy condition "${condition}": ${error.message}`);
  }

  for (const name of parsed.identifiers) {
    if (!(name in context)) {
      if (!unknownIdentifierWarnings.has(name)) {
        unknownIdentifierWarnings.add(name);
        console.warn(`Unknown identifier "${name}" in condition "${condition}" - condition evaluates to false`);
      }
      return false;
    }
    // Indicator not yet available (e.g. warmup period) - never coerce null to 0
    if (context[name] === null || context[name] === undefined) {
      return false;
    }
  }

  return Boolean(evaluateAst(parsed.ast, context));
}

// Run backtest simulation (on simulated data - pass preloadedData to reuse a series)
export async function runBacktest(config, preloadedData = null) {
  const { symbol, startDate, endDate, timeframe, initialCapital, strategy, indicators, riskPercent } = config;

  // Generate simulated data (or reuse a previously generated series)
  const rawData = preloadedData || await fetchHistoricalData(symbol, startDate, endDate, timeframe);

  if (rawData.length === 0) {
    throw new Error('No simulated price data available');
  }
  
  // Prepare data structure
  const data = {
    timestamp: rawData.map(d => d.timestamp),
    open: rawData.map(d => d.open),
    high: rawData.map(d => d.high),
    low: rawData.map(d => d.low),
    close: rawData.map(d => d.close),
    volume: rawData.map(d => d.volume)
  };
  
  // Calculate indicators
  const indicatorResults = calculateIndicators(data, indicators);
  
  // Initialize backtest state
  let equity = initialCapital;
  let position = null;
  const trades = [];
  const equityCurve = [{ timestamp: data.timestamp[0], equity: initialCapital }];
  
  // Run simulation
  for (let i = 50; i < data.timestamp.length; i++) {
    const candle = {
      timestamp: data.timestamp[i],
      open: data.open[i],
      high: data.high[i],
      low: data.low[i],
      close: data.close[i],
      volume: data.volume[i]
    };
    
    const currentIndicators = {};
    Object.keys(indicatorResults).forEach(key => {
      if (key !== 'timestamp' && key !== 'open' && key !== 'high' && key !== 'low' && key !== 'close' && key !== 'volume') {
        currentIndicators[key] = indicatorResults[key][i];
      }
    });
    
    // Check for entry
    if (!position) {
      const longEntry = evaluateCondition(strategy.longEntry, candle, currentIndicators, null);
      const shortEntry = evaluateCondition(strategy.shortEntry, candle, currentIndicators, null);
      
      if (longEntry || shortEntry) {
        const riskAmount = equity * (riskPercent / 100);
        const stopLoss = longEntry ? 
          candle.close * (1 - strategy.stopLossPercent / 100) :
          candle.close * (1 + strategy.stopLossPercent / 100);
        const takeProfit = longEntry ?
          candle.close * (1 + strategy.takeProfitPercent / 100) :
          candle.close * (1 - strategy.takeProfitPercent / 100);
        
        position = {
          side: longEntry ? 'Long' : 'Short',
          entryPrice: candle.close,
          entryTime: candle.timestamp,
          stopLoss,
          takeProfit,
          quantity: riskAmount / Math.abs(candle.close - stopLoss)
        };
      }
    }
    // Check for exit
    else {
      let exitPrice = null;
      let exitReason = null;
      
      // Stop loss / Take profit
      if (position.side === 'Long') {
        if (candle.low <= position.stopLoss) {
          exitPrice = position.stopLoss;
          exitReason = 'Stop Loss';
        } else if (candle.high >= position.takeProfit) {
          exitPrice = position.takeProfit;
          exitReason = 'Take Profit';
        }
      } else {
        if (candle.high >= position.stopLoss) {
          exitPrice = position.stopLoss;
          exitReason = 'Stop Loss';
        } else if (candle.low <= position.takeProfit) {
          exitPrice = position.takeProfit;
          exitReason = 'Take Profit';
        }
      }
      
      // Strategy exit
      if (!exitPrice && strategy.exitCondition) {
        const shouldExit = evaluateCondition(strategy.exitCondition, candle, currentIndicators, position);
        if (shouldExit) {
          exitPrice = candle.close;
          exitReason = 'Strategy Exit';
        }
      }
      
      if (exitPrice) {
        const pnl = position.side === 'Long' ?
          (exitPrice - position.entryPrice) * position.quantity :
          (position.entryPrice - exitPrice) * position.quantity;
        
        equity += pnl;
        
        trades.push({
          side: position.side,
          entryPrice: position.entryPrice,
          exitPrice,
          entryTime: position.entryTime,
          exitTime: candle.timestamp,
          quantity: position.quantity,
          pnl,
          exitReason
        });
        
        position = null;
      }
    }
    
    equityCurve.push({ timestamp: candle.timestamp, equity });
  }
  
  // Calculate statistics
  const winningTrades = trades.filter(t => t.pnl > 0);
  const losingTrades = trades.filter(t => t.pnl < 0);
  
  const totalReturn = ((equity - initialCapital) / initialCapital) * 100;
  const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;
  const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnl, 0) / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0) / losingTrades.length) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * winningTrades.length) / (avgLoss * losingTrades.length) : 0;
  
  // Max drawdown
  let peak = initialCapital;
  let maxDrawdown = 0;
  equityCurve.forEach(point => {
    if (point.equity > peak) peak = point.equity;
    const drawdown = ((peak - point.equity) / peak) * 100;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  });
  
  return {
    trades,
    equityCurve,
    data_source: 'simulated',
    stats: {
      initialCapital,
      finalEquity: equity,
      totalReturn,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      maxDrawdown,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0
    }
  };
}

// Parameter optimization
// Generates the simulated data series ONCE and runs every parameter
// combination against the SAME series so the rankings are comparable.
// Returns { results, data } so callers can reuse the series.
export async function optimizeParameters(baseConfig, paramRanges, metric = 'totalReturn') {
  const results = [];

  // Generate the price series once for all combinations
  const data = await fetchHistoricalData(baseConfig.symbol, baseConfig.startDate, baseConfig.endDate, baseConfig.timeframe);

  if (data.length === 0) {
    throw new Error('No simulated price data available');
  }

  // Generate parameter combinations
  const combinations = generateCombinations(paramRanges);

  for (const params of combinations) {
    const config = { ...baseConfig, ...params };

    const result = await runBacktest(config, data);
    results.push({
      params,
      stats: result.stats,
      score: result.stats[metric]
    });
  }

  // Sort by score
  results.sort((a, b) => b.score - a.score);

  return { results, data };
}

function generateCombinations(ranges) {
  const keys = Object.keys(ranges);
  const combinations = [];
  
  function generate(index, current) {
    if (index === keys.length) {
      combinations.push({ ...current });
      return;
    }
    
    const key = keys[index];
    const range = ranges[key];
    
    for (let val = range.min; val <= range.max; val += range.step) {
      current[key] = val;
      generate(index + 1, current);
    }
  }
  
  generate(0, {});
  return combinations;
}