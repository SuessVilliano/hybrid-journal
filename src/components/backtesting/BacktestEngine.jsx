// Advanced Backtesting Engine
import { base44 } from '@/api/base44Client';

// Fetch historical price data
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

// Evaluate entry condition
function evaluateCondition(condition, candle, indicators, position) {
  try {
    const context = {
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      ...indicators,
      position
    };
    
    // Simple condition parser
    return new Function(...Object.keys(context), `return ${condition}`)(...Object.values(context));
  } catch (error) {
    console.error('Error evaluating condition:', error);
    return false;
  }
}

// Run backtest simulation
export async function runBacktest(config) {
  const { symbol, startDate, endDate, timeframe, initialCapital, strategy, indicators, riskPercent } = config;
  
  // Fetch historical data
  const rawData = await fetchHistoricalData(symbol, startDate, endDate, timeframe);
  
  if (rawData.length === 0) {
    throw new Error('No historical data available');
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
export async function optimizeParameters(baseConfig, paramRanges, metric = 'totalReturn') {
  const results = [];
  
  // Generate parameter combinations
  const combinations = generateCombinations(paramRanges);
  
  for (const params of combinations) {
    const config = { ...baseConfig, ...params };
    
    try {
      const result = await runBacktest(config);
      results.push({
        params,
        stats: result.stats,
        score: result.stats[metric]
      });
    } catch (error) {
      console.error('Optimization error:', error);
    }
  }
  
  // Sort by score
  results.sort((a, b) => b.score - a.score);
  
  return results;
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