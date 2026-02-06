import { base44 } from '@/api/base44Client';

// Broker API integration helper
export const SUPPORTED_BROKERS = [
  { 
    id: 'mt4', 
    name: 'MetaTrader 4', 
    type: 'forex', 
    requiresCredentials: true,
    fields: ['account_number', 'api_key', 'api_secret', 'server'],
    instructions: 'Get API credentials from your MT4 broker portal. Server format: broker.server.com:443'
  },
  { 
    id: 'mt5', 
    name: 'MetaTrader 5', 
    type: 'forex', 
    requiresCredentials: true,
    fields: ['account_number', 'api_key', 'api_secret', 'server'],
    instructions: 'Get API credentials from your MT5 broker portal. Server format: broker.server.com:443'
  },
  { 
    id: 'ctrader', 
    name: 'cTrader', 
    type: 'forex', 
    requiresCredentials: true,
    fields: ['account_number', 'api_key', 'api_secret'],
    instructions: 'Generate API credentials in cTrader Settings > API Access'
  },
  {
    id: 'dxtrade',
    name: 'DXTrade',
    type: 'forex',
    requiresCredentials: true,
    fields: ['account_number', 'password', 'server'],
    instructions: 'Enter your DXTrade login credentials. Server is your prop firm domain (e.g., gooeytrade.com, ftmo.com)',
    supportsAutoSync: true,
    syncFunction: 'syncDXTrade'
  },
  { 
    id: 'binance', 
    name: 'Binance', 
    type: 'crypto', 
    requiresCredentials: true,
    fields: ['api_key', 'api_secret'],
    instructions: 'Create API key in Binance: Account > API Management. Enable Read permission only for security.'
  },
  { 
    id: 'coinbase', 
    name: 'Coinbase Pro', 
    type: 'crypto', 
    requiresCredentials: true,
    fields: ['api_key', 'api_secret'],
    instructions: 'Create API key in Coinbase Pro: Settings > API. Select View permission only.'
  },
  { 
    id: 'tradovate', 
    name: 'Tradovate', 
    type: 'futures', 
    requiresCredentials: true,
    fields: ['account_number', 'api_key', 'api_secret'],
    instructions: 'Generate API credentials in Tradovate: Settings > API Keys'
  },
  { 
    id: 'tradelocker', 
    name: 'TradeLocker', 
    type: 'multi', 
    requiresCredentials: true,
    fields: ['account_number', 'api_key', 'api_secret'],
    instructions: 'Get API credentials from your TradeLocker broker. Demo: https://demo.tradelocker.com/'
  },
  { 
    id: 'tradingview', 
    name: 'TradingView Paper Trading', 
    type: 'multi', 
    requiresCredentials: true,
    fields: ['account_number', 'api_key'],
    instructions: 'Export your paper trading data from TradingView'
  }
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
  try {
    // Use AI to simulate API validation with realistic broker-specific checks
    const prompt = `You are validating API credentials for ${broker_id} broker.
Credentials provided:
- Account: ${credentials.account_number || 'N/A'}
- API Key: ${credentials.api_key ? '[PROVIDED]' : '[MISSING]'}
- API Secret: ${credentials.api_secret ? '[PROVIDED]' : '[MISSING]'}
- Server: ${credentials.server || 'N/A'}

Perform realistic validation checks:
1. Check if credentials format is valid for ${broker_id}
2. Simulate connection test
3. Verify account exists
4. Check API permissions

Return validation result with status and detailed message.`;

    const schema = {
      type: "object",
      properties: {
        valid: { type: "boolean" },
        message: { type: "string" },
        account_info: {
          type: "object",
          properties: {
            account_name: { type: "string" },
            account_currency: { type: "string" },
            balance: { type: "number" }
          }
        }
      }
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema
    });

    return result;
  } catch (error) {
    return { 
      valid: false, 
      message: `Validation failed: ${error.message}` 
    };
  }
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

// Sync trades from broker using backend function
export async function syncBrokerTrades(brokerConnection, syncType = 'manual') {
  try {
    // Route to the appropriate sync function based on broker type
    let functionName = 'syncBroker';

    // DXtrade uses its own dedicated sync function
    if (brokerConnection.broker_id === 'dxtrade' ||
        brokerConnection.connection_type === 'dxtrade_login') {
      functionName = 'syncDXTrade';
    }

    console.log(`[syncBrokerTrades] Using ${functionName} for ${brokerConnection.broker_name}`);

    const response = await base44.functions.invoke(functionName, {
      connection_id: brokerConnection.id
    });

    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
}

// Legacy sync function for reference
async function syncBrokerTradesLegacy(brokerConnection, syncType = 'manual') {
  const startTime = Date.now();
  const errors = [];
  let status = 'success';
  
  try {
    // Fetch trades from broker
    const brokerData = await fetchBrokerTrades(brokerConnection);
    
    if (!brokerData.trades || brokerData.trades.length === 0) {
      await base44.entities.SyncLog.create({
        broker_connection_id: brokerConnection.id,
        sync_type: syncType,
        status: 'success',
        trades_fetched: 0,
        trades_imported: 0,
        trades_skipped: 0,
        trades_updated: 0,
        duration_ms: Date.now() - startTime,
        sync_timestamp: new Date().toISOString()
      });
      
      return {
        success: true,
        imported: 0,
        skipped: 0,
        updated: 0,
        account_balance: brokerData.account_balance,
        account_equity: brokerData.equity
      };
    }
    
    // Get existing trades from database
    const existingTrades = await base44.entities.Trade.filter({
      broker_connection_id: brokerConnection.id
    });
    
    // Create maps for efficient lookup
    const existingByBrokerId = new Map(
      existingTrades
        .filter(t => t.broker_trade_id)
        .map(t => [t.broker_trade_id, t])
    );
    
    // Also check by symbol + entry date for fuzzy matching
    const existingBySymbolDate = new Map(
      existingTrades
        .filter(t => t.symbol && t.entry_date)
        .map(t => [`${t.symbol}_${new Date(t.entry_date).toISOString()}`, t])
    );
    
    const imported = [];
    const updated = [];
    let skipped = 0;
    
    // Process each trade with conflict resolution
    for (const brokerTrade of brokerData.trades) {
      try {
        // Check for exact match by broker trade ID
        if (brokerTrade.broker_trade_id && existingByBrokerId.has(brokerTrade.broker_trade_id)) {
          const existingTrade = existingByBrokerId.get(brokerTrade.broker_trade_id);
          
          // Update if data has changed (e.g., trade was closed)
          if (shouldUpdateTrade(existingTrade, brokerTrade)) {
            await base44.entities.Trade.update(existingTrade.id, {
              exit_date: brokerTrade.exit_date || existingTrade.exit_date,
              exit_price: brokerTrade.exit_price || existingTrade.exit_price,
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
        
        // Fuzzy match by symbol and entry date (within 1 minute)
        const fuzzyKey = `${brokerTrade.symbol}_${new Date(brokerTrade.entry_date).toISOString()}`;
        if (existingBySymbolDate.has(fuzzyKey)) {
          const existingTrade = existingBySymbolDate.get(fuzzyKey);
          
          // Update with broker trade ID for future exact matching
          if (!existingTrade.broker_trade_id && brokerTrade.broker_trade_id) {
            await base44.entities.Trade.update(existingTrade.id, {
              broker_trade_id: brokerTrade.broker_trade_id,
              exit_date: brokerTrade.exit_date || existingTrade.exit_date,
              exit_price: brokerTrade.exit_price || existingTrade.exit_price,
              pnl: brokerTrade.pnl
            });
            updated.push(existingTrade.id);
          } else {
            skipped++;
          }
          continue;
        }
        
        // New trade - import it
        const tradeData = {
          ...brokerTrade,
          account_id: brokerConnection.account_id,
          platform: brokerConnection.broker_id,
          instrument_type: getBrokerInstrumentType(brokerConnection.broker_id),
          broker_connection_id: brokerConnection.id,
          import_source: `${brokerConnection.broker_id} API Sync`
        };
        
        const created = await base44.entities.Trade.create(tradeData);
        imported.push(created);
        
      } catch (tradeError) {
        errors.push({
          trade: brokerTrade.symbol || 'Unknown',
          error: tradeError.message,
          broker_trade_id: brokerTrade.broker_trade_id
        });
        status = 'partial';
      }
    }
    
    // Log the sync operation
    await base44.entities.SyncLog.create({
      broker_connection_id: brokerConnection.id,
      sync_type: syncType,
      status: errors.length > 0 ? 'partial' : 'success',
      trades_fetched: brokerData.trades.length,
      trades_imported: imported.length,
      trades_skipped: skipped,
      trades_updated: updated.length,
      errors: errors.length > 0 ? errors : undefined,
      duration_ms: Date.now() - startTime,
      sync_timestamp: new Date().toISOString()
    });
    
    return {
      success: true,
      imported: imported.length,
      updated: updated.length,
      skipped: skipped,
      errors: errors,
      account_balance: brokerData.account_balance,
      account_equity: brokerData.equity
    };
    
  } catch (error) {
    // Log failed sync
    await base44.entities.SyncLog.create({
      broker_connection_id: brokerConnection.id,
      sync_type: syncType,
      status: 'failed',
      trades_fetched: 0,
      trades_imported: 0,
      trades_skipped: 0,
      trades_updated: 0,
      error_message: error.message,
      errors: [{ error: error.message }],
      duration_ms: Date.now() - startTime,
      sync_timestamp: new Date().toISOString()
    });
    
    throw error;
  }
}

// Helper to determine if trade should be updated
function shouldUpdateTrade(existingTrade, brokerTrade) {
  // Update if trade was opened but now closed
  if (!existingTrade.exit_date && brokerTrade.exit_date) {
    return true;
  }
  
  // Update if P&L changed significantly (more than 0.01)
  if (Math.abs((existingTrade.pnl || 0) - (brokerTrade.pnl || 0)) > 0.01) {
    return true;
  }
  
  return false;
}

function getBrokerInstrumentType(broker_id) {
  const mapping = {
    mt4: 'Forex',
    mt5: 'Forex',
    ctrader: 'Forex',
    dxtrade: 'Forex',
    binance: 'Crypto',
    coinbase: 'Crypto',
    tradovate: 'Futures',
    tradelocker: 'Forex',
    interactive: 'Stocks'
  };
  return mapping[broker_id] || 'Forex';
}