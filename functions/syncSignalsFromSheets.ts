import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const SPREADSHEET_ID = '1jWQKlzry3PJ1ECJO_SbNczpRjfpvi4sMEaYu_pN6Jg8';

// All three sheet tabs
const SHEETS = [
  { name: 'Paradox Crypto', gid: '0' },
  { name: 'Hybrid AI', gid: '128714687' },
  { name: 'Forex', gid: '1470834705' }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Authenticate user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User authenticated:', user.email);

    // Get Google Sheets access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');
    console.log('Got access token:', accessToken ? 'Yes' : 'No');

    if (!accessToken) {
      throw new Error('Failed to get Google Sheets access token. Please re-authorize the integration.');
    }

    // Get existing signals to avoid duplicates
    const existingSignals = await base44.asServiceRole.entities.Signal.list('-created_date', 1000);
    const existingSymbols = new Set(
      existingSignals.map(s => `${s.symbol}_${s.action}_${s.price}_${new Date(s.created_date).toISOString().split('T')[0]}`)
    );

    let totalSignalsCreated = 0;
    const allErrors = [];

    // Loop through all sheets
    for (const sheet of SHEETS) {
      console.log(`Processing sheet: ${sheet.name}`);
      
      try {
        // Fetch data from this sheet tab
        const range = `${sheet.name}!A:Z`;
        const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
        
        console.log('Fetching from URL:', sheetsUrl);

        const response = await fetch(sheetsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`${sheet.name} response status:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`${sheet.name} API error:`, errorText);
          allErrors.push(`${sheet.name}: API error ${response.status}`);
          continue;
        }

        const data = await response.json();
        const rows = data.values || [];
        console.log(`${sheet.name} rows fetched:`, rows.length);

        if (rows.length === 0) {
          console.log(`${sheet.name}: No data found`);
          continue;
        }

        // First row is headers
        const headers = rows[0].map(h => (h || '').toLowerCase().trim());
        const dataRows = rows.slice(1);
        console.log(`${sheet.name} headers:`, headers);
        console.log(`${sheet.name} data rows:`, dataRows.length);

        let signalsCreated = 0;

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

            // Parse signal data - flexible field names
            const symbol = rowData.symbol || rowData.ticker || rowData.pair || rowData.asset || '';
            const action = (rowData.action || rowData.side || rowData.direction || rowData.type || '').toUpperCase();
            const price = parseFloat(rowData.price || rowData.entry || rowData['entry price'] || rowData['entry_price'] || 0);
            const timestamp = rowData.timestamp || rowData.date || rowData.time || new Date().toISOString();

            if (!symbol || !action || !price) {
              continue; // Skip invalid rows silently
            }

            // Only process BUY/SELL actions
            if (action !== 'BUY' && action !== 'SELL') {
              continue;
            }

            // Create unique key to check for duplicates
            const signalKey = `${symbol}_${action}_${price}_${timestamp.split('T')[0]}`;
            if (existingSymbols.has(signalKey)) {
              continue; // Skip duplicate
            }

            // Parse additional fields
            const signalData = {
              provider: rowData.provider || rowData.source || sheet.name,
              symbol: symbol,
              action: action,
              price: price,
              stop_loss: parseFloat(rowData['stop loss'] || rowData.sl || rowData.stoploss || rowData['stop_loss'] || 0),
              take_profit: parseFloat(rowData['take profit'] || rowData.tp || rowData.takeprofit || rowData['take_profit'] || rowData.tp1 || 0),
              take_profits: parseTakeProfits(rowData),
              timeframe: rowData.timeframe || rowData.tf || rowData.interval || rowData.period || '',
              confidence: parseFloat(rowData.confidence || rowData.score || rowData.strength || 85),
              strategy: rowData.strategy || rowData['strategy name'] || rowData.system || '',
              notes: rowData.notes || rowData.comment || rowData.description || rowData.remarks || '',
              status: 'new',
              raw_data: rowData,
              created_by: user.email
            };

            console.log(`Creating signal from ${sheet.name}:`, signalData.symbol, signalData.action);
            await base44.asServiceRole.entities.Signal.create(signalData);
            signalsCreated++;
            totalSignalsCreated++;
            existingSymbols.add(signalKey); // Add to set to avoid duplicates within same sync

          } catch (error) {
            console.error(`Error processing row ${i + 2} in ${sheet.name}:`, error);
            allErrors.push(`${sheet.name} Row ${i + 2}: ${error.message}`);
          }
        }

        console.log(`${sheet.name}: Created ${signalsCreated} signals`);

      } catch (error) {
        console.error(`Error processing sheet ${sheet.name}:`, error);
        allErrors.push(`${sheet.name}: ${error.message}`);
      }
    }

    return Response.json({
      success: true,
      message: `Sync complete: ${totalSignalsCreated} new signals imported from all sheets`,
      signalsCreated: totalSignalsCreated,
      errors: allErrors.length > 0 ? allErrors : null
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
    const tp = parseFloat(
      rowData[`tp${i}`] || 
      rowData[`tp ${i}`] || 
      rowData[`tp_${i}`] || 
      rowData[`target${i}`] ||
      rowData[`target_${i}`] ||
      0
    );
    if (tp > 0) {
      takeProfits.push(tp);
    }
  }
  
  return takeProfits;
}