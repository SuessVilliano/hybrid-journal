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
        const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
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
          
          const ticket = cleanCell(cells[0]);
          const openTime = cleanCell(cells[1]);
          const type = cleanCell(cells[2]);
          const size = parseFloat(cleanCell(cells[3]));
          const symbol = cleanCell(cells[4]);
          const openPrice = parseFloat(cleanCell(cells[5]));
          const closeTime = cells[8] ? cleanCell(cells[8]) : null;
          const closePrice = cells[9] ? parseFloat(cleanCell(cells[9])) : null;
          const commission = cells[10] ? parseFloat(cleanCell(cells[10])) : 0;
          const swap = cells[11] ? parseFloat(cleanCell(cells[11])) : 0;
          const profit = cells[12] ? parseFloat(cleanCell(cells[12])) : 0;

          if (symbol && !isNaN(profit)) {
            trades.push({
              symbol: symbol,
              side: type.toLowerCase().includes('buy') ? 'Long' : 'Short',
              entry_date: new Date(openTime).toISOString(),
              exit_date: closeTime ? new Date(closeTime).toISOString() : null,
              entry_price: openPrice,
              exit_price: closePrice,
              quantity: size,
              commission: commission,
              swap: swap,
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
        const values = lines[i].split(',').map(v => v.trim());
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

    const headers = lines[0].toLowerCase().split(',');
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
        
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
    
    const headers = lines[0].toLowerCase().split(',');
    
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim());
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
  }
};

// Helper function to map CSV columns to trade object
function mapCSVToTrade(headers, values) {
  const trade = {
    import_source: 'CSV Import'
  };

  headers.forEach((header, index) => {
    const value = values[index];
    if (!value) return;

    const h = header.toLowerCase();

    if (h.includes('symbol') || h.includes('instrument') || h.includes('item') || h === 'pair') {
      trade.symbol = value;
    }
    else if (h.includes('side') || h.includes('direction') || h.includes('type')) {
      const v = value.toLowerCase();
      trade.side = (v.includes('buy') || v.includes('long')) ? 'Long' : 'Short';
    }
    else if ((h.includes('entry') || h.includes('open')) && h.includes('price')) {
      trade.entry_price = parseFloat(value);
    }
    else if ((h.includes('exit') || h.includes('close')) && h.includes('price')) {
      trade.exit_price = parseFloat(value);
    }
    else if (h === 'price' && !trade.entry_price) {
      trade.entry_price = parseFloat(value);
    }
    else if (h.includes('quantity') || h.includes('volume') || h.includes('lots') || h.includes('size') || h.includes('amount')) {
      trade.quantity = parseFloat(value);
    }
    else if (h.includes('profit') || h.includes('pnl') || h.includes('p/l') || h.includes('p&l') || h === 'net') {
      trade.pnl = parseFloat(value);
    }
    else if ((h.includes('entry') || h.includes('open')) && (h.includes('date') || h.includes('time'))) {
      try {
        trade.entry_date = new Date(value).toISOString();
      } catch (e) {
        trade.entry_date = value;
      }
    }
    else if ((h.includes('exit') || h.includes('close')) && (h.includes('date') || h.includes('time'))) {
      try {
        trade.exit_date = new Date(value).toISOString();
      } catch (e) {
        trade.exit_date = value;
      }
    }
    else if (h.includes('stop') && (h.includes('loss') || h.includes('sl'))) {
      trade.stop_loss = parseFloat(value);
    }
    else if (h.includes('take') && (h.includes('profit') || h.includes('tp'))) {
      trade.take_profit = parseFloat(value);
    }
    else if (h.includes('commission') || h.includes('fee')) {
      trade.commission = parseFloat(value);
    }
    else if (h.includes('swap') || h.includes('rollover')) {
      trade.swap = parseFloat(value);
    }
    else if (h.includes('platform') || h.includes('broker')) {
      trade.platform = value;
    }
  });

  return trade;
}

// Auto-detect file format
export function detectFormat(filename, content) {
  const lower = filename.toLowerCase();
  
  if (lower.endsWith('.html') || lower.endsWith('.htm') || content.includes('<html') || content.includes('<table')) {
    return 'mt4Html';
  }
  
  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    const firstLines = content.split('\n').slice(0, 5).join('\n').toLowerCase();
    
    if (firstLines.includes('metatrader') || firstLines.includes('ticket')) {
      return 'mt4Csv';
    }
    if (firstLines.includes('ctrader') || firstLines.includes('position id')) {
      return 'cTrader';
    }
    if (firstLines.includes('dxtrade') || firstLines.includes('devexperts')) {
      return 'dxTrade';
    }
    
    return 'csv';
  }
  
  return 'csv';
}

// Parse trades from file
export async function parseTradeFile(file) {
  const text = await file.text();
  const format = detectFormat(file.name, text);
  
  const parser = parsers[format];
  if (!parser) {
    throw new Error(`Unsupported format: ${format}`);
  }
  
  return parser(text);
}