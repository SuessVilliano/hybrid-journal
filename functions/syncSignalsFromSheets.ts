import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SPREADSHEET_ID = '1jWQKlzry3PJ1ECJO_SbNczpRjfpvi4sMEaYu_pN6Jg8';
const SHEET_NAME = 'Sheet1'; // Adjust if your sheet has a different name

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Google Sheets access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Fetch data from Google Sheets
    const range = `${SHEET_NAME}!A:Z`; // Adjust range as needed
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
    
    const response = await fetch(sheetsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Sheets API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const rows = data.values || [];

    if (rows.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No data found in sheet',
        signalsCreated: 0
      });
    }

    // First row is headers
    const headers = rows[0].map(h => h.toLowerCase().trim());
    const dataRows = rows.slice(1);

    // Get existing signals to avoid duplicates
    const existingSignals = await base44.asServiceRole.entities.Signal.list('-created_date', 1000);
    const existingSymbols = new Set(
      existingSignals.map(s => `${s.symbol}_${s.action}_${s.price}_${new Date(s.created_date).toISOString().split('T')[0]}`)
    );

    let signalsCreated = 0;
    const errors = [];

    // Parse each row and create signals
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      if (!row || row.length === 0) continue;

      try {
        // Map row data to object using headers
        const rowData = {};
        headers.forEach((header, index) => {
          rowData[header] = row[index] || '';
        });

        // Parse signal data - adjust field names based on your sheet structure
        const symbol = rowData.symbol || rowData.ticker || rowData.pair || '';
        const action = (rowData.action || rowData.side || rowData.direction || '').toUpperCase();
        const price = parseFloat(rowData.price || rowData.entry || rowData['entry price'] || 0);
        const timestamp = rowData.timestamp || rowData.date || rowData.time || new Date().toISOString();

        if (!symbol || !action || !price) {
          errors.push(`Row ${i + 2}: Missing required fields (symbol, action, or price)`);
          continue;
        }

        // Create unique key to check for duplicates
        const signalKey = `${symbol}_${action}_${price}_${timestamp.split('T')[0]}`;
        if (existingSymbols.has(signalKey)) {
          continue; // Skip duplicate
        }

        // Parse additional fields
        const signalData = {
          provider: rowData.provider || rowData.source || 'Google Sheets',
          symbol: symbol,
          action: action,
          price: price,
          stop_loss: parseFloat(rowData['stop loss'] || rowData.sl || rowData.stoploss || 0),
          take_profit: parseFloat(rowData['take profit'] || rowData.tp || rowData.takeprofit || rowData.tp1 || 0),
          take_profits: parseTakeProfits(rowData),
          timeframe: rowData.timeframe || rowData.tf || rowData.interval || '',
          confidence: parseFloat(rowData.confidence || rowData.score || 85),
          strategy: rowData.strategy || rowData['strategy name'] || '',
          notes: rowData.notes || rowData.comment || rowData.description || '',
          status: 'new',
          raw_data: rowData,
          created_by: user.email
        };

        // Create signal
        await base44.asServiceRole.entities.Signal.create(signalData);
        signalsCreated++;

      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    return Response.json({
      success: true,
      message: `Sync complete: ${signalsCreated} new signals imported`,
      signalsCreated: signalsCreated,
      totalRows: dataRows.length,
      errors: errors.length > 0 ? errors : null
    });

  } catch (error) {
    console.error('Sheet sync error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

/**
 * Parse multiple take profit levels from row data
 */
function parseTakeProfits(rowData) {
  const takeProfits = [];
  
  // Look for tp1, tp2, tp3, etc.
  for (let i = 1; i <= 5; i++) {
    const tp = parseFloat(rowData[`tp${i}`] || rowData[`tp ${i}`] || 0);
    if (tp > 0) {
      takeProfits.push(tp);
    }
  }
  
  return takeProfits;
}