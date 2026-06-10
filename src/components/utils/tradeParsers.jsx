// Trade parsers for different platforms and file formats

// Parse a monetary/numeric value from broker statements.
// Strips currency symbols ($, €, £), commas and spaces; treats "(x)" as negative.
// Returns undefined (never NaN) when the value is not a finite number.
export function parseMoney(value) {
  if (value === undefined || value === null) return undefined;
  let str = String(value).trim();
  if (!str) return undefined;
  let negative = false;
  if (/^\(.*\)$/.test(str)) {
    negative = true;
    str = str.slice(1, -1);
  }
  str = str.replace(/[$€£,\s]/g, '');
  if (!str) return undefined;
  const num = parseFloat(str);
  if (!Number.isFinite(num)) return undefined;
  return negative ? -Math.abs(num) : num;
}

// Parse statement dates, including the MT4/5 "YYYY.MM.DD HH:MM[:SS]" format
// which the native Date constructor cannot handle. Returns an ISO string,
// or undefined (never throws) when the date is invalid.
export function parseStatementDate(value) {
  if (value === undefined || value === null) return undefined;
  const str = String(value).trim();
  if (!str) return undefined;
  const mtMatch = str.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  let date;
  if (mtMatch) {
    const [, year, month, day, hours, minutes, seconds] = mtMatch;
    date = new Date(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      hours ? parseInt(hours, 10) : 0,
      minutes ? parseInt(minutes, 10) : 0,
      seconds ? parseInt(seconds, 10) : 0
    );
  } else {
    date = new Date(str);
  }
  return isNaN(date.getTime()) ? undefined : date.toISOString();
}

// Locate MT4/5 statement columns by matching header row text (case-insensitive).
// Returns null when the row doesn't look like an MT4 trade header.
function mapMT4HeaderColumns(headerTexts) {
  const texts = headerTexts.map(h => String(h).toLowerCase().trim());
  const profitIdx = texts.indexOf('profit');
  if (profitIdx === -1) return null;
  const findCol = (...names) => {
    const idx = texts.findIndex(h => names.includes(h));
    return idx >= 0 ? idx : undefined;
  };
  const firstPrice = texts.indexOf('price');
  const lastPrice = texts.lastIndexOf('price');
  return {
    openTime: findCol('open time', 'opentime'),
    type: findCol('type'),
    size: findCol('size', 'volume', 'lots'),
    symbol: findCol('item', 'symbol'),
    openPrice: findCol('open price') ?? (firstPrice >= 0 ? firstPrice : undefined),
    closeTime: findCol('close time', 'closetime'),
    closePrice: findCol('close price') ?? (lastPrice > firstPrice ? lastPrice : undefined),
    commission: findCol('commission'),
    swap: findCol('swap'),
    profit: profitIdx
  };
}

// Default MT4 column indices when no header row is found. The 14-column
// statement layout includes a Taxes column: Ticket(0), Open Time(1), Type(2),
// Size(3), Item(4), Price(5), S/L(6), T/P(7), Close Time(8), Price(9),
// Commission(10), Taxes(11), Swap(12), Profit(13). The 13-column variant
// omits Taxes, shifting Swap to 11 and Profit to 12.
function defaultMT4Columns(columnCount) {
  const hasTaxes = columnCount >= 14;
  return {
    openTime: 1,
    type: 2,
    size: 3,
    symbol: 4,
    openPrice: 5,
    closeTime: 8,
    closePrice: 9,
    commission: 10,
    swap: hasTaxes ? 12 : 11,
    profit: hasTaxes ? 13 : 12
  };
}

// Merge header-matched columns over the index fallbacks
function resolveMT4Columns(headerCols, columnCount) {
  const cols = defaultMT4Columns(columnCount);
  if (headerCols) {
    Object.keys(headerCols).forEach(key => {
      if (headerCols[key] !== undefined) cols[key] = headerCols[key];
    });
  }
  return cols;
}

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
        if (trade.symbol) {
          if (trade.pnl === undefined) {
            errors.push({ line: i + 1, error: 'Invalid or missing P&L value — row skipped' });
          } else {
            trades.push(trade);
          }
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
      const cleanCell = (cell) => cell.replace(/<[^>]*>/g, '').trim();

      // Locate columns by matching header row text, with index fallbacks
      let headerCols = null;
      for (const row of rowMatches) {
        const headerCells = row.match(/<t[dh][^>]*>(.*?)<\/t[dh]>/gis);
        if (!headerCells) continue;
        const mapped = mapMT4HeaderColumns(headerCells.map(cleanCell));
        if (mapped) {
          headerCols = mapped;
          break;
        }
      }

      for (let i = 1; i < rowMatches.length; i++) {
        try {
          const cells = rowMatches[i].match(/<td[^>]*>(.*?)<\/td>/gis);
          if (!cells || cells.length < 8) continue;

          const cols = resolveMT4Columns(headerCols, cells.length);
          const cellValue = (idx) => (idx !== undefined && cells[idx] !== undefined) ? cleanCell(cells[idx]) : '';

          const type = cellValue(cols.type);
          if (!type.toLowerCase().includes('buy') && !type.toLowerCase().includes('sell')) continue;

          const symbol = cellValue(cols.symbol);
          if (!symbol) continue;

          const profit = parseMoney(cellValue(cols.profit));
          if (profit === undefined) {
            errors.push({ line: i, error: `Invalid or missing profit value: "${cellValue(cols.profit)}" — row skipped` });
            continue;
          }

          const entryDate = parseStatementDate(cellValue(cols.openTime));
          if (!entryDate) {
            errors.push({ line: i, error: `Unparseable open time: "${cellValue(cols.openTime)}" — row skipped` });
            continue;
          }

          trades.push({
            symbol: symbol,
            side: type.toLowerCase().includes('buy') ? 'Long' : 'Short',
            entry_date: entryDate,
            exit_date: parseStatementDate(cellValue(cols.closeTime)) || null,
            entry_price: parseMoney(cellValue(cols.openPrice)),
            exit_price: parseMoney(cellValue(cols.closePrice)) ?? null,
            quantity: parseMoney(cellValue(cols.size)),
            commission: parseMoney(cellValue(cols.commission)) ?? 0,
            swap: parseMoney(cellValue(cols.swap)) ?? 0,
            pnl: profit,
            platform: 'MT4/MT5',
            instrument_type: 'Forex',
            import_source: 'MT4/5 HTML Statement'
          });
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

    // Locate columns by matching header row text, with index fallbacks
    const headerCols = lines.length > 0 ? mapMT4HeaderColumns(parseCSVLine(lines[0])) : null;

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        if (values.length < 10) continue;

        const cols = resolveMT4Columns(headerCols, values.length);

        const type = values[cols.type];
        if (!type || (!type.toLowerCase().includes('buy') && !type.toLowerCase().includes('sell'))) continue;
        if (!values[cols.symbol]) continue;

        const pnl = parseMoney(values[cols.profit]);
        if (pnl === undefined) {
          errors.push({ line: i + 1, error: `Invalid or missing profit value: "${values[cols.profit]}" — row skipped` });
          continue;
        }

        const entryDate = parseStatementDate(values[cols.openTime]);
        if (!entryDate) {
          errors.push({ line: i + 1, error: `Unparseable open time: "${values[cols.openTime]}" — row skipped` });
          continue;
        }

        trades.push({
          symbol: values[cols.symbol],
          side: type.toLowerCase().includes('buy') ? 'Long' : 'Short',
          entry_date: entryDate,
          exit_date: parseStatementDate(values[cols.closeTime]) || null,
          entry_price: parseMoney(values[cols.openPrice]),
          exit_price: parseMoney(values[cols.closePrice]) ?? null,
          quantity: parseMoney(values[cols.size]),
          commission: parseMoney(values[cols.commission]) ?? 0,
          swap: parseMoney(values[cols.swap]) ?? 0,
          pnl: pnl,
          platform: 'MT4/MT5',
          instrument_type: 'Forex',
          import_source: 'MT4/5 CSV'
        });
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

        const entryDate = values[entryTimeIdx] ? parseStatementDate(values[entryTimeIdx]) : new Date().toISOString();
        if (values[entryTimeIdx] && !entryDate) {
          errors.push({ line: i + 1, error: `Unparseable entry time: "${values[entryTimeIdx]}" — row skipped` });
          continue;
        }

        const trade = {
          symbol: values[symbolIdx],
          side: values[sideIdx]?.toLowerCase().includes('buy') ? 'Long' : 'Short',
          entry_date: entryDate,
          exit_date: values[closeTimeIdx] ? (parseStatementDate(values[closeTimeIdx]) || null) : null,
          entry_price: parseMoney(values[entryPriceIdx]),
          exit_price: parseMoney(values[closePriceIdx]),
          quantity: parseMoney(values[volumeIdx]),
          pnl: parseMoney(values[profitIdx]),
          platform: 'cTrader',
          instrument_type: 'Forex',
          import_source: 'cTrader CSV'
        };

        if (trade.symbol) {
          if (trade.pnl === undefined) {
            errors.push({ line: i + 1, error: `Invalid or missing profit value: "${values[profitIdx]}" — row skipped` });
          } else {
            trades.push(trade);
          }
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
        
        if (trade.symbol) {
          if (trade.pnl === undefined) {
            errors.push({ line: i + 1, error: 'Invalid or missing P&L value — row skipped' });
          } else {
            trade.platform = 'DXTrade';
            trade.import_source = 'DXTrade Export';
            trades.push(trade);
          }
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
        
        if (trade.symbol) {
          if (trade.pnl === undefined) {
            errors.push({ line: i + 1, error: 'Invalid or missing P&L value — row skipped' });
          } else {
            trade.platform = 'MatchTrader';
            trade.import_source = 'MatchTrader Export';
            trades.push(trade);
          }
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
        
        if (trade.symbol) {
          if (trade.pnl === undefined) {
            errors.push({ line: i + 1, error: 'Invalid or missing P&L value — row skipped' });
          } else {
            trade.platform = 'Rithmic';
            trade.instrument_type = 'Futures';
            trade.import_source = 'Rithmic Report';
            trades.push(trade);
          }
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
        
        if (trade.symbol) {
          if (trade.pnl === undefined) {
            errors.push({ line: i + 1, error: 'Invalid or missing P&L value — row skipped' });
          } else {
            trade.platform = 'TradingView';
            trade.import_source = 'TradingView Paper Trading';
            trades.push(trade);
          }
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
      trade.entry_price = parseMoney(value);
    }
    // Exit price
    else if ((h.includes('exit') || h.includes('close') || h.includes('fill')) && h.includes('price')) {
      trade.exit_price = parseMoney(value);
    }
    // Generic price
    else if (h === 'price' && !trade.entry_price) {
      trade.entry_price = parseMoney(value);
    }
    // Quantity variations
    else if (h.includes('quantity') || h.includes('volume') || h.includes('lots') ||
             h.includes('size') || h.includes('amount') || h.includes('contracts') || h === 'qty') {
      trade.quantity = parseMoney(value);
    }
    // P&L variations
    else if (h.includes('profit') || h.includes('pnl') || h.includes('p/l') ||
             h.includes('p&l') || h === 'net' || h.includes('realized')) {
      trade.pnl = parseMoney(value);
    }
    // Entry date/time
    else if ((h.includes('entry') || h.includes('open') || h.includes('fill')) &&
             (h.includes('date') || h.includes('time') || h.includes('timestamp'))) {
      trade.entry_date = parseStatementDate(value) || value;
    }
    // Exit date/time
    else if ((h.includes('exit') || h.includes('close')) &&
             (h.includes('date') || h.includes('time') || h.includes('timestamp'))) {
      trade.exit_date = parseStatementDate(value) || value;
    }
    // Stop loss
    else if ((h.includes('stop') && (h.includes('loss') || h.includes('sl'))) || h === 'sl') {
      trade.stop_loss = parseMoney(value);
    }
    // Take profit
    else if ((h.includes('take') && (h.includes('profit') || h.includes('tp'))) || h === 'tp') {
      trade.take_profit = parseMoney(value);
    }
    // Commission/Fees
    else if (h.includes('commission') || h.includes('fee') || h.includes('cost')) {
      trade.commission = parseMoney(value);
    }
    // Swap/Rollover
    else if (h.includes('swap') || h.includes('rollover') || h.includes('financing')) {
      trade.swap = parseMoney(value);
    }
    // Platform/Broker
    else if (h.includes('platform') || h.includes('broker') || h.includes('account')) {
      trade.platform = value;
    }
  });

  return trade;
}

// Try to detect account number from the first few lines of a CSV/text file
export function detectAccountNumberFromContent(content) {
  const firstLines = content.split('\n').slice(0, 15).join('\n');
  // Common patterns: "Account: 12345", "Login: 12345", "Account Number: 12345", "Account ID: 12345"
  const patterns = [
    /account\s*(?:number|no\.?|id|#)?[:\s]+([A-Z0-9\-_]+)/i,
    /login[:\s]+([A-Z0-9\-_]+)/i,
    /client\s*(?:id|no\.?)?[:\s]+([A-Z0-9\-_]+)/i,
  ];
  for (const pattern of patterns) {
    const match = firstLines.match(pattern);
    if (match && match[1] && match[1].length >= 3) {
      return match[1].trim();
    }
  }
  return null;
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
  
  const result = parser(text);
  // Try to detect account number from file content for CSV/HTML files
  if (!result.detected_account_number) {
    result.detected_account_number = detectAccountNumberFromContent(text);
  }
  return result;
}

// AI-powered PDF parser - Universal for all trading platforms
async function parsePDFWithAI(file, aiHelper) {
  try {
    const schema = {
      type: "object",
      properties: {
        platform: { type: "string", description: "Detected broker/platform name" },
        account_number: { type: "string", description: "Account number or login ID found in the statement, if present" },
        account_name: { type: "string", description: "Account holder name found in the statement, if present" },
        trades: {
          type: "array",
          items: {
            type: "object",
            properties: {
              symbol: { type: "string", description: "Trading symbol" },
              side: { type: "string", description: "Long or Short" },
              entry_date: { type: "string", description: "Entry date/time in ISO format" },
              exit_date: { type: "string", description: "Exit date/time in ISO format, null if still open" },
              entry_price: { type: "number", description: "Entry price" },
              exit_price: { type: "number", description: "Exit price, null if still open" },
              quantity: { type: "number", description: "Position size" },
              pnl: { type: "number", description: "Profit/Loss in account currency" },
              commission: { type: "number", description: "Total commission/fees" },
              swap: { type: "number", description: "Swap/overnight fees if any" }
            },
            required: ["symbol", "pnl"]
          }
        }
      }
    };

    const prompt = `You are analyzing a trading account statement PDF. Extract ALL completed trades from this document.

INSTRUCTIONS:
1. Identify the broker/platform (DXTrade, MetaTrader, cTrader, etc.)
2. Extract the account number/login ID and account holder name from the statement header if present
3. Extract EVERY completed trade (trades that have been closed with a final P&L)
3. Match opening and closing transactions to create complete trade records
4. For each completed trade, extract:
   - symbol: The trading instrument (e.g., EURUSD, NAS100, BTC/USD)
   - side: "Long" (for buy/long positions) or "Short" (for sell/short positions)
   - entry_date: When the position was opened (ISO format: YYYY-MM-DDTHH:mm:ss)
   - exit_date: When the position was closed (ISO format)
   - entry_price: Price at which position was opened
   - exit_price: Price at which position was closed
   - quantity: Position size (lots, contracts, shares, etc.)
   - pnl: Final profit or loss (negative for losses)
   - commission: Total fees/commission (set to 0 if not shown)
   - swap: Overnight financing charges (set to 0 if not shown)

IMPORTANT:
- Only include COMPLETED trades (both entry and exit)
- Do NOT include open positions or pending orders
- Match buy/sell pairs to create complete trades
- Convert all dates to ISO format (YYYY-MM-DDTHH:mm:ss)
- Use negative numbers for losses
- If you see a table with transactions, look for pairs where:
  * Opening transaction (Buy or Sell)
  * Closing transaction (opposite direction, same symbol and size)
  * The closing transaction typically has the P&L value

Look for sections like: "Closed Trades", "Trade History", "Transactions", "Positions", "Orders"

Return the platform name and the array of trades. If you cannot find any completed trades, return an empty array.`;

    const result = await aiHelper({
      prompt,
      response_json_schema: schema
    });

    if (!result.trades || result.trades.length === 0) {
      return { 
        trades: [], 
        errors: [{ 
          line: 0, 
          error: 'No completed trades found in PDF. The statement may only contain open positions, or the format is not recognized. Try exporting as CSV if available.' 
        }], 
        format: result.platform || 'PDF Statement' 
      };
    }

    // Process and validate trades
    const validTrades = [];
    const errors = [];

    result.trades.forEach((trade, index) => {
      try {
        // Validate required fields
        const pnl = parseMoney(trade.pnl);
        if (!trade.symbol || pnl === undefined) {
          errors.push({
            line: index + 1,
            error: `Missing required fields (symbol or P&L)`
          });
          return;
        }

        // Normalize the trade
        const normalizedTrade = {
          symbol: trade.symbol.trim().toUpperCase(),
          side: trade.side === 'Long' || trade.side === 'Buy' ? 'Long' : 'Short',
          entry_date: parseStatementDate(trade.entry_date) || new Date().toISOString(),
          exit_date: parseStatementDate(trade.exit_date) || new Date().toISOString(),
          entry_price: parseMoney(trade.entry_price) ?? 0,
          exit_price: parseMoney(trade.exit_price) ?? 0,
          quantity: parseMoney(trade.quantity) ?? 1,
          pnl: pnl,
          commission: parseMoney(trade.commission) ?? 0,
          swap: parseMoney(trade.swap) ?? 0,
          platform: result.platform || 'Unknown',
          instrument_type: detectInstrumentType(trade.symbol),
          import_source: `${result.platform || 'PDF'} Statement`
        };

        validTrades.push(normalizedTrade);
      } catch (error) {
        errors.push({ 
          line: index + 1, 
          error: `Error processing trade: ${error.message}` 
        });
      }
    });

    return { 
      trades: validTrades, 
      errors, 
      format: `${result.platform || 'PDF'} Statement`,
      detected_account_number: result.account_number || null,
      detected_account_name: result.account_name || null
    };
  } catch (error) {
    return { 
      trades: [], 
      errors: [{ 
        line: 0, 
        error: `AI parsing failed: ${error.message}. The PDF format may not be supported. Try exporting your trades as CSV from your broker platform.` 
      }], 
      format: 'PDF Statement' 
    };
  }
}

// Helper to detect instrument type from symbol
function detectInstrumentType(symbol) {
  const s = symbol.toUpperCase();
  if (s.includes('USD') || s.includes('EUR') || s.includes('GBP') || s.includes('JPY')) {
    return 'Forex';
  }
  if (s.includes('BTC') || s.includes('ETH') || s.includes('CRYPTO')) {
    return 'Crypto';
  }
  if (s.includes('100') || s.includes('SPX') || s.includes('NQ') || s.includes('ES')) {
    return 'Futures';
  }
  if (s.includes('CALL') || s.includes('PUT')) {
    return 'Options';
  }
  return 'Stocks';
}