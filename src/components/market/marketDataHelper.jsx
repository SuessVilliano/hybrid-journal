import { base44 } from '@/api/base44Client';

// Fetch live market data using AI
export async function fetchLiveMarketData(symbols) {
  try {
    const symbolList = Array.isArray(symbols) ? symbols.join(', ') : symbols;
    
    const prompt = `Get real-time market data for these symbols: ${symbolList}
    
For each symbol, provide:
- current price (bid/ask)
- 24h change percentage
- 24h volume
- high/low for the day

Return accurate, current market data from live sources.`;

    const schema = {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              symbol: { type: "string" },
              price: { type: "number" },
              bid: { type: "number" },
              ask: { type: "number" },
              change: { type: "number" },
              changePercent: { type: "number" },
              high24h: { type: "number" },
              low24h: { type: "number" },
              volume24h: { type: "number" },
              timestamp: { type: "string" }
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
    console.error('Error fetching live data:', error);
    return [];
  }
}

// Fetch historical OHLCV data for charting
export async function fetchChartData(symbol, timeframe = '1h', bars = 100) {
  try {
    const prompt = `Fetch the last ${bars} ${timeframe} candlesticks for ${symbol}.
    
Return an array of OHLCV data with:
- timestamp (ISO format)
- open, high, low, close prices
- volume

Use real, current market data from reliable sources.`;

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
    console.error('Error fetching chart data:', error);
    return [];
  }
}

// Calculate technical indicators
export function calculateIndicators(data, config) {
  const close = data.map(d => d.close);
  const high = data.map(d => d.high);
  const low = data.map(d => d.low);
  
  const indicators = {};
  
  if (config.sma) {
    indicators.sma = calculateSMA(close, config.sma.period);
  }
  
  if (config.ema) {
    indicators.ema = calculateEMA(close, config.ema.period);
  }
  
  if (config.rsi) {
    indicators.rsi = calculateRSI(close, config.rsi.period);
  }
  
  if (config.bollinger) {
    indicators.bollinger = calculateBollingerBands(close, config.bollinger.period);
  }
  
  return indicators;
}

function calculateSMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

function calculateEMA(data, period) {
  const result = [];
  const multiplier = 2 / (period + 1);
  let ema = data[0];
  result.push(ema);
  
  for (let i = 1; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
    result.push(ema);
  }
  return result;
}

function calculateRSI(data, period = 14) {
  const changes = [];
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }
  
  const result = [null];
  for (let i = period; i < data.length; i++) {
    const gains = changes.slice(i - period, i).filter(c => c > 0).reduce((a, b) => a + b, 0) / period;
    const losses = Math.abs(changes.slice(i - period, i).filter(c => c < 0).reduce((a, b) => a + b, 0)) / period;
    const rs = gains / (losses || 0.0001);
    result.push(100 - (100 / (1 + rs)));
  }
  return result;
}

function calculateBollingerBands(data, period = 20, stdDev = 2) {
  const sma = calculateSMA(data, period);
  const upper = [];
  const lower = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
      const std = Math.sqrt(variance);
      upper.push(mean + stdDev * std);
      lower.push(mean - stdDev * std);
    }
  }
  
  return { upper, middle: sma, lower };
}