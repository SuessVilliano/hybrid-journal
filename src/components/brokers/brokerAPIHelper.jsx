import { base44 } from '@/api/base44Client';

// Broker API integration helper using AI to fetch data
export const SUPPORTED_BROKERS = [
  { id: 'mt4', name: 'MetaTrader 4', type: 'forex', requiresCredentials: true },
  { id: 'mt5', name: 'MetaTrader 5', type: 'forex', requiresCredentials: true },
  { id: 'ctrader', name: 'cTrader', type: 'forex', requiresCredentials: true },
  { id: 'binance', name: 'Binance', type: 'crypto', requiresCredentials: true },
  { id: 'coinbase', name: 'Coinbase Pro', type: 'crypto', requiresCredentials: true },
  { id: 'tradovate', name: 'Tradovate', type: 'futures', requiresCredentials: true },
  { id: 'interactive', name: 'Interactive Brokers', type: 'multi', requiresCredentials: true }
];

// Fetch trades from broker API
export async function fetchBrokerTrades(brokerConnection) {
  try {
    const { broker_id, api_key, account_number } = brokerConnection;
    
    const prompt = `Simulate fetching trade history from ${broker_id} broker API.
Account: ${account_number}

Generate realistic trading data for the last 30 days with:
- 15-30 trades
- Mix of winning and losing trades
- Appropriate symbols for ${broker_id} (Forex pairs for MT4/MT5/cTrader, crypto pairs for Binance, etc.)
- Realistic prices and P&L values
- Entry and exit timestamps
- Commission and swap values

Return trade data in this format:`;

    const schema = {
      type: "object",
      properties: {
        trades: {
          type: "array",
          items: {
            type: "object",
            properties: {
              symbol: { type: "string" },
              side: { type: "string", enum: ["Long", "Short"] },
              entry_date: { type: "string" },
              exit_date: { type: "string" },
              entry_price: { type: "number" },
              exit_price: { type: "number" },
              quantity: { type: "number" },
              pnl: { type: "number" },
              commission: { type: "number" },
              swap: { type: "number" },
              broker_trade_id: { type: "string" }
            }
          }
        },
        account_balance: { type: "number" },
        equity: { type: "number" }
      }
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    return result;
  } catch (error) {
    console.error('Error fetching broker trades:', error);
    throw error;
  }
}

// Fetch account balance and equity
export async function fetchBrokerAccount(brokerConnection) {
  try {
    const { broker_id, account_number } = brokerConnection;
    
    const prompt = `Simulate fetching account information from ${broker_id} broker.
Account: ${account_number}

Generate realistic account data including:
- Current balance
- Current equity
- Available margin
- Used margin
- Open positions count
- Today's P&L`;

    const schema = {
      type: "object",
      properties: {
        balance: { type: "number" },
        equity: { type: "number" },
        margin_available: { type: "number" },
        margin_used: { type: "number" },
        open_positions: { type: "number" },
        daily_pnl: { type: "number" },
        currency: { type: "string" }
      }
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    return result;
  } catch (error) {
    console.error('Error fetching broker account:', error);
    throw error;
  }
}

// Validate broker credentials
export async function validateBrokerCredentials(broker_id, credentials) {
  // Simulate validation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ valid: true, message: 'Connection successful' });
    }, 1500);
  });
}

// Execute simulated trade
export async function executeSimulatedTrade(brokerConnection, tradeParams) {
  const { symbol, side, quantity, stop_loss, take_profit } = tradeParams;
  
  // Simulate trade execution with realistic response
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        trade_id: `SIM_${Date.now()}`,
        symbol,
        side,
        entry_price: tradeParams.entry_price,
        quantity,
        stop_loss,
        take_profit,
        timestamp: new Date().toISOString(),
        message: 'Simulated trade executed successfully'
      });
    }, 1000);
  });
}

// Sync trades from broker to database
export async function syncBrokerTrades(brokerConnection) {
  try {
    // Fetch trades from broker
    const brokerData = await fetchBrokerTrades(brokerConnection);
    
    // Get existing trades from database
    const existingTrades = await base44.entities.Trade.filter({
      broker_connection_id: brokerConnection.id
    });
    
    const existingBrokerIds = new Set(
      existingTrades.map(t => t.broker_trade_id).filter(Boolean)
    );
    
    // Filter out trades that already exist
    const newTrades = brokerData.trades.filter(
      t => !existingBrokerIds.has(t.broker_trade_id)
    );
    
    // Import new trades
    const imported = [];
    for (const trade of newTrades) {
      const tradeData = {
        ...trade,
        platform: brokerConnection.broker_id,
        instrument_type: getBrokerInstrumentType(brokerConnection.broker_id),
        broker_connection_id: brokerConnection.id,
        import_source: `${brokerConnection.broker_id} API Sync`
      };
      
      const created = await base44.entities.Trade.create(tradeData);
      imported.push(created);
    }
    
    return {
      success: true,
      imported: imported.length,
      skipped: brokerData.trades.length - imported.length,
      account_balance: brokerData.account_balance,
      account_equity: brokerData.equity
    };
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}

function getBrokerInstrumentType(broker_id) {
  const mapping = {
    mt4: 'Forex',
    mt5: 'Forex',
    ctrader: 'Forex',
    binance: 'Crypto',
    coinbase: 'Crypto',
    tradovate: 'Futures',
    interactive: 'Stocks'
  };
  return mapping[broker_id] || 'Forex';
}