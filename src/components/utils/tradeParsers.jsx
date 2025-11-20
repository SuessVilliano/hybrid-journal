// Trade parsers for different platforms and file formats

export const parsers = {
  // Generic CSV parser with flexible column mapping
  csv: (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) throw new Error('CSV file is empty or invalid');
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const trades = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const trade = mapCSVToTrade(headers, values);
        if (trade.symbol && trade.pnl !== undefined) {
          trades.push(trade);
        }
      } catch (error) {
        errors.push({ line: i + 1, error: error.message });
      }
    }

    return { trades, errors, format: 'Generic CSV' };
  },

  // MetaTrader 4/5 Statement HTML parser
  mt4Html: (text) => {
    const trades = [];
    const errors = [];
    
    try {
      const tableMatch = text.match(/<table[^>]*>(.*?)<\/table>/gis);
      if (!tableMatch) throw new Error('No trade table found in MT4/5 HTML');

      const rowMatches = tableMatch[0].match(/<tr[^>]*>(.*?)<\/tr>/gis);
      
      for (let i = 1; i < rowMatches.length; i++) {
        try {
          const cells = rowMatches[i].match(/<td[^>]*>(.*?)<\/td>/gis);
          if (!cells || cells.length < 8) continue;

          const cleanCell = (cell) => cell.replace(/<[^>]*>/g, '').trim();
          
          const type = cleanCell(cells[2]);
          const symbol = cleanCell(cells[4]);
          const openPrice = parseFloat(cleanCell(cells[5]));
          const closePrice = cells[9] ? parseFloat(cleanCell(cells[9])) : null;
          const profit = cells[12] ? parseFloat(cleanCell(cells[12])) : 0;

          if (symbol && !isNaN(profit)) {
            trades.push({
              symbol: symbol,
              side: type.toLowerCase().includes('buy') ? 'Long' : 'Short',
              entry_date: new Date(cleanCell(cells[1])).toISOString(),
              exit_date: cells[8] ? new Date(cleanCell(cells[8])).toISOString() : null,
              entry_price: openPrice,
              exit_price: closePrice,
              quantity: parseFloat(cleanCell(cells[3])),
              commission: cells[10] ? parseFloat(cleanCell(cells[10])) : 0,
              swap: cells[11] ? parseFloat(cleanCell(cells[11])) : 0,
              pnl: profit,
              platform: 'MT4/MT5',
              instrument_type: 'Forex',
              import_source: 'MT4/5 HTML Statement'
            });
          }
        } catch (error) {
          errors.push({ line: i, error: error.message });
        }
      }
    } catch (error) {
      errors.push({ line: 0, error: error.message });
    }

    return { trades, errors, format: 'MetaTrader 4/5 HTML' };
  },

  // MetaTrader CSV format parser
  mt4Csv: (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const trades = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        if (values.length < 10) continue;

        const type = values[2];
        if (!type || (!type.toLowerCase().includes('buy') && !type.toLowerCase().includes('sell'))) continue;

        const trade = {
          symbol: values[4],
          side: type.toLowerCase().includes('buy') ? 'Long' : 'Short',
          entry_date: new Date(values[1]).toISOString(),
          exit_date: values[8] ? new Date(values[8]).toISOString() : null,
          entry_price: parseFloat(values[5]),
          exit_price: values[9] ? parseFloat(values[9]) : null,
          quantity: parseFloat(values[3]),
          commission: values[10] ? parseFloat(values[10]) : 0,
          swap: values[12] ? parseFloat(values[12]) : 0,
          pnl: values[13] ? parseFloat(values[13]) : 0,
          platform: 'MT4/MT5',
          instrument_type: 'Forex',
          import_source: 'MT4/5 CSV'
        };

        if (trade.symbol && !isNaN(trade.pnl)) {
          trades.push(trade);
        }
      } catch (error) {
        errors.push({ line: i + 1, error: error.message });
      }
    }

    return { trades, errors, format: 'MetaTrader CSV' };
  },

  // cTrader format parser
  cTrader: (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const trades = [];
    const errors = [];

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        
        const symbolIdx = headers.findIndex(h => h.includes('symbol'));
        const sideIdx = headers.findIndex(h => h.includes('side') || h.includes('direction'));
        const volumeIdx = headers.findIndex(h => h.includes('volume') || h.includes('quantity'));
        const entryPriceIdx = headers.findIndex(h => h.includes('entry') && h.includes('price'));
        const closePriceIdx = headers.findIndex(h => h.includes('close') && h.includes('price'));
        const profitIdx = headers.findIndex(h => h.includes('net') && h.includes('profit'));
        const entryTimeIdx = headers.findIndex(h => h.includes('entry') && h.includes('time'));
        const closeTimeIdx = headers.findIndex(h => h.includes('close') && h.includes('time'));

        const trade = {
          symbol: values[symbolIdx],
          side: values[sideIdx]?.toLowerCase().includes('buy') ? 'Long' : 'Short',
          entry_date: values[entryTimeIdx] ? new Date(values[entryTimeIdx]).toISOString() : new Date().toISOString(),
          exit_date: values[closeTimeIdx] ? new Date(values[closeTimeIdx]).toISOString() : null,
          entry_price: parseFloat(values[entryPriceIdx]),
          exit_price: parseFloat(values[closePriceIdx]),
          quantity: parseFloat(values[volumeIdx]),
          pnl: parseFloat(values[profitIdx]),
          platform: 'cTrader',
          instrument_type: 'Forex',
          import_source: 'cTrader CSV'
        };

        if (trade.symbol && !isNaN(trade.pnl)) {
          trades.push(trade);
        }
      } catch (error) {
        errors.push({ line: i + 1, error: error.message });
      }
    }

    return { trades, errors, format: 'cTrader' };
  },

  // DXTrade format
  dxTrade: (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const trades = [];
    const errors = [];
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const trade = mapCSVToTrade(headers, values);
        
        if (trade.symbol && trade.pnl !== undefined) {
          trade.platform = 'DXTrade';
          trade.import_source = 'DXTrade Export';
          trades.push(trade);
        }
      } catch (error) {
        errors.push({ line: i + 1, error: error.message });
      }
    }

    return { trades, errors, format: 'DXTrade' };
  },

  // MatchTrader format
  matchTrader: (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const trades = [];
    const errors = [];
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const trade = mapCSVToTrade(headers, values);
        
        if (trade.symbol && trade.pnl !== undefined) {
          trade.platform = 'MatchTrader';
          trade.import_source = 'MatchTrader Export';
          trades.push(trade);
        }
      } catch (error) {
        errors.push({ line: i + 1, error: error.message });
      }
    }

    return { trades, errors, format: 'MatchTrader' };
  },

  // Rithmic format
  rithmic: (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const trades = [];
    const errors = [];
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const trade = mapCSVToTrade(headers, values);
        
        if (trade.symbol && trade.pnl !== undefined) {
          trade.platform = 'Rithmic';
          trade.instrument_type = 'Futures';
          trade.import_source = 'Rithmic Report';
          trades.push(trade);
        }
      } catch (error) {
        errors.push({ line: i + 1, error: error.message });
      }
    }

    return { trades, errors, format: 'Rithmic' };
  },

  // TradingView Paper Trading format
  tradingView: (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    const trades = [];
    const errors = [];
    
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const trade = mapCSVToTrade(headers, values);
        
        if (trade.symbol && trade.pnl !== undefined) {
          trade.platform = 'TradingView';
          trade.import_source = 'TradingView Paper Trading';
          trades.push(trade);
        }
      } catch (error) {
        errors.push({ line: i + 1, error: error.message });
      }
    }

    return { trades, errors, format: 'TradingView Paper Trading' };
  },

  // DXTrade PDF Statement parser (AI-powered)
  dxTradePdf: async (content, filename) => {
    // This will be called from parseTradeFile with special handling for PDFs
    return { trades: [], errors: [], format: 'DXTrade PDF', requiresAI: true };
  }
};

// Parse CSV line handling quoted values
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values.map(v => v.replace(/^["']|["']$/g, ''));
}

// Helper function to map CSV columns to trade object
function mapCSVToTrade(headers, values) {
  const trade = {
    import_source: 'CSV Import'
  };

  headers.forEach((header, index) => {
    const value = values[index];
    if (!value) return;

    const h = header.toLowerCase();

    // Symbol detection
    if (h.includes('symbol') || h.includes('instrument') || h.includes('item') || h === 'pair' || h === 'ticker') {
      trade.symbol = value.replace(/['"]/g, '');
    }
    // Side/Direction detection
    else if (h.includes('side') || h.includes('direction') || h.includes('type') || h.includes('action')) {
      const v = value.toLowerCase();
      trade.side = (v.includes('buy') || v.includes('long')) ? 'Long' : 'Short';
    }
    // Entry price
    else if ((h.includes('entry') || h.includes('open')) && h.includes('price')) {
      trade.entry_price = parseFloat(value);
    }
    // Exit price
    else if ((h.includes('exit') || h.includes('close') || h.includes('fill')) && h.includes('price')) {
      trade.exit_price = parseFloat(value);
    }
    // Generic price
    else if (h === 'price' && !trade.entry_price) {
      trade.entry_price = parseFloat(value);
    }
    // Quantity variations
    else if (h.includes('quantity') || h.includes('volume') || h.includes('lots') || 
             h.includes('size') || h.includes('amount') || h.includes('contracts') || h === 'qty') {
      trade.quantity = parseFloat(value);
    }
    // P&L variations
    else if (h.includes('profit') || h.includes('pnl') || h.includes('p/l') || 
             h.includes('p&l') || h === 'net' || h.includes('realized')) {
      trade.pnl = parseFloat(value);
    }
    // Entry date/time
    else if ((h.includes('entry') || h.includes('open') || h.includes('fill')) && 
             (h.includes('date') || h.includes('time') || h.includes('timestamp'))) {
      try {
        trade.entry_date = new Date(value).toISOString();
      } catch (e) {
        trade.entry_date = value;
      }
    }
    // Exit date/time
    else if ((h.includes('exit') || h.includes('close')) && 
             (h.includes('date') || h.includes('time') || h.includes('timestamp'))) {
      try {
        trade.exit_date = new Date(value).toISOString();
      } catch (e) {
        trade.exit_date = value;
      }
    }
    // Stop loss
    else if ((h.includes('stop') && (h.includes('loss') || h.includes('sl'))) || h === 'sl') {
      trade.stop_loss = parseFloat(value);
    }
    // Take profit
    else if ((h.includes('take') && (h.includes('profit') || h.includes('tp'))) || h === 'tp') {
      trade.take_profit = parseFloat(value);
    }
    // Commission/Fees
    else if (h.includes('commission') || h.includes('fee') || h.includes('cost')) {
      trade.commission = parseFloat(value);
    }
    // Swap/Rollover
    else if (h.includes('swap') || h.includes('rollover') || h.includes('financing')) {
      trade.swap = parseFloat(value);
    }
    // Platform/Broker
    else if (h.includes('platform') || h.includes('broker') || h.includes('account')) {
      trade.platform = value;
    }
  });

  return trade;
}

// Auto-detect file format
export function detectFormat(filename, content) {
  const lower = filename.toLowerCase();
  const firstLines = content.split('\n').slice(0, 10).join('\n').toLowerCase();
  
  // PDF Detection
  if (lower.endsWith('.pdf') || content.startsWith('%PDF')) {
    return 'dxTradePdf';
  }
  
  // HTML Detection
  if (lower.endsWith('.html') || lower.endsWith('.htm') || content.includes('<html') || content.includes('<table')) {
    return 'mt4Html';
  }
  
  // CSV/TXT Detection
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    // Platform-specific detection
    if (firstLines.includes('metatrader') || firstLines.includes('ticket')) {
      return 'mt4Csv';
    }
    if (firstLines.includes('ctrader') || firstLines.includes('position id')) {
      return 'cTrader';
    }
    if (firstLines.includes('dxtrade') || firstLines.includes('devexperts')) {
      return 'dxTrade';
    }
    if (firstLines.includes('match-trader') || firstLines.includes('matchtrader')) {
      return 'matchTrader';
    }
    if (firstLines.includes('rithmic') || firstLines.includes('r | trader')) {
      return 'rithmic';
    }
    if (firstLines.includes('tradingview') || firstLines.includes('paper trading')) {
      return 'tradingView';
    }
    
    // Generic CSV fallback
    return 'csv';
  }
  
  return 'csv';
}

// Parse trades from file
export async function parseTradeFile(file, aiHelper) {
  const format = detectFormat(file.name, '');
  
  // Handle PDF files with AI parsing
  if (format === 'dxTradePdf' && aiHelper) {
    return await parsePDFWithAI(file, aiHelper);
  }
  
  const text = await file.text();
  const detectedFormat = detectFormat(file.name, text);
  
  const parser = parsers[detectedFormat];
  if (!parser) {
    throw new Error(`Unsupported format: ${detectedFormat}`);
  }
  
  return parser(text);
}

// AI-powered PDF parser
async function parsePDFWithAI(file, aiHelper) {
  try {
    const schema = {
      type: "object",
      properties: {
        trades: {
          type: "array",
          items: {
            type: "object",
            properties: {
              transaction_id: { type: "string" },
              transaction_time: { type: "string" },
              direction: { type: "string" },
              size: { type: "number" },
              symbol: { type: "string" },
              price: { type: "number" },
              order_id: { type: "string" },
              settled_pnl: { type: "number" },
              commission: { type: "number" }
            }
          }
        }
      }
    };

    const prompt = `Extract all trading transactions from this DXTrade PDF statement.

For each transaction, extract:
- transaction_id: The transaction ID
- transaction_time: Date and time (convert to ISO format if possible)
- direction: "Buy" or "Sell"
- size: Position size/quantity
- symbol: Trading symbol (e.g., NAS100, SOL/USD.crypto)
- price: Execution price
- order_id: Order ID
- settled_pnl: Settled P&L (profit/loss, can be null if not closed)
- commission: Commission fee

IMPORTANT: 
- Extract ALL transactions from the Transactions section
- Only include rows with actual trade data
- settled_pnl will be empty (null) for opening trades, and have a value for closing trades
- Convert all numeric values to numbers, not strings`;

    const result = await aiHelper({
      prompt,
      file_urls: [file],
      response_json_schema: schema
    });

    if (!result.trades || result.trades.length === 0) {
      return { trades: [], errors: [{ line: 0, error: 'No trades found in PDF' }], format: 'DXTrade PDF' };
    }

    // Match buy/sell pairs to create complete trades
    const completedTrades = [];
    const errors = [];
    const transactions = result.trades;

    // Group by symbol and match pairs
    const symbolGroups = {};
    transactions.forEach(t => {
      if (!symbolGroups[t.symbol]) {
        symbolGroups[t.symbol] = [];
      }
      symbolGroups[t.symbol].push(t);
    });

    Object.keys(symbolGroups).forEach(symbol => {
      const txns = symbolGroups[symbol].sort((a, b) => 
        new Date(a.transaction_time) - new Date(b.transaction_time)
      );

      for (let i = 0; i < txns.length; i++) {
        const txn = txns[i];
        
        // If this transaction has a settled P&L, it's a closing trade
        if (txn.settled_pnl !== null && txn.settled_pnl !== undefined && txn.settled_pnl !== 0) {
          // Find the matching opening trade
          let openTrade = null;
          for (let j = i - 1; j >= 0; j--) {
            const prevTxn = txns[j];
            if (prevTxn.direction !== txn.direction && 
                prevTxn.size === txn.size &&
                !prevTxn.matched) {
              openTrade = prevTxn;
              prevTxn.matched = true;
              break;
            }
          }

          if (openTrade) {
            const trade = {
              symbol: txn.symbol,
              side: openTrade.direction === 'Buy' ? 'Long' : 'Short',
              entry_date: new Date(openTrade.transaction_time).toISOString(),
              exit_date: new Date(txn.transaction_time).toISOString(),
              entry_price: openTrade.price,
              exit_price: txn.price,
              quantity: txn.size,
              pnl: txn.settled_pnl,
              commission: (openTrade.commission || 0) + (txn.commission || 0),
              platform: 'DXTrade',
              instrument_type: txn.symbol.includes('crypto') ? 'Crypto' : 
                             txn.symbol.includes('100') || txn.symbol.includes('SPX') ? 'Futures' : 'Forex',
              import_source: 'DXTrade PDF Statement'
            };
            completedTrades.push(trade);
          }
        }
      }
    });

    return { 
      trades: completedTrades, 
      errors, 
      format: 'DXTrade PDF Statement' 
    };
  } catch (error) {
    return { 
      trades: [], 
      errors: [{ line: 0, error: `PDF parsing failed: ${error.message}` }], 
      format: 'DXTrade PDF' 
    };
  }
}