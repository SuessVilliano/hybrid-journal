import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Sync trades from Hybrid Funding public dashboard
// URL pattern: https://hybridfundingdashboard.propaccount.com/es/overview?accountId={login}

interface HybridFundingTrade {
    dealId: string;
    symbol: string;
    openDate: string;
    openPrice: number;
    closeDate: string;
    closePrice: number;
    type: string; // BUY or SELL
    stopLoss: number | null;
    takeProfit: number | null;
    lots: number;
    profit: number;
    duration: string;
}

interface HybridFundingMetrics {
    balance: number;
    equity: number;
    profitTarget: number | null;
    dailyLossLimit: number | null;
    maxDrawdown: number | null;
    totalProfitLoss: number;
}

// Parse the Hybrid Funding dashboard HTML to extract trades
function parseHybridFundingDashboard(html: string): {
    trades: HybridFundingTrade[];
    metrics: HybridFundingMetrics;
} {
    const trades: HybridFundingTrade[] = [];
    const metrics: HybridFundingMetrics = {
        balance: 0,
        equity: 0,
        profitTarget: null,
        dailyLossLimit: null,
        maxDrawdown: null,
        totalProfitLoss: 0
    };

    try {
        // Extract account metrics from the dashboard
        // Look for patterns like "Balance: $50,000.00" or "Equity: $51,234.56"
        const balanceMatch = html.match(/Balance[:\s]*\$?([\d,]+\.?\d*)/i);
        if (balanceMatch) {
            metrics.balance = parseFloat(balanceMatch[1].replace(/,/g, ''));
        }

        const equityMatch = html.match(/Equity[:\s]*\$?([\d,]+\.?\d*)/i);
        if (equityMatch) {
            metrics.equity = parseFloat(equityMatch[1].replace(/,/g, ''));
        }

        const profitTargetMatch = html.match(/Profit\s*Target[:\s]*\$?([\d,]+\.?\d*)/i);
        if (profitTargetMatch) {
            metrics.profitTarget = parseFloat(profitTargetMatch[1].replace(/,/g, ''));
        }

        const dailyLossMatch = html.match(/Daily\s*Loss\s*Limit[:\s]*\$?([\d,]+\.?\d*)/i);
        if (dailyLossMatch) {
            metrics.dailyLossLimit = parseFloat(dailyLossMatch[1].replace(/,/g, ''));
        }

        const maxDrawdownMatch = html.match(/Max\s*Draw\s*down[:\s]*\$?([\d,]+\.?\d*)/i);
        if (maxDrawdownMatch) {
            metrics.maxDrawdown = parseFloat(maxDrawdownMatch[1].replace(/,/g, ''));
        }

        // Try to find JSON data embedded in the page (common in React/Vue apps)
        const jsonDataMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/);
        if (jsonDataMatch) {
            try {
                const data = JSON.parse(jsonDataMatch[1]);
                if (data.trades) {
                    // Process trades from JSON
                    for (const t of data.trades) {
                        trades.push({
                            dealId: t.dealId || t.id || `${t.symbol}_${t.openDate}`,
                            symbol: t.symbol,
                            openDate: t.openDate || t.openTime,
                            openPrice: parseFloat(t.openPrice),
                            closeDate: t.closeDate || t.closeTime,
                            closePrice: parseFloat(t.closePrice),
                            type: t.type || t.side,
                            stopLoss: t.stopLoss ? parseFloat(t.stopLoss) : null,
                            takeProfit: t.takeProfit ? parseFloat(t.takeProfit) : null,
                            lots: parseFloat(t.lots || t.volume),
                            profit: parseFloat(t.profit || t.pnl),
                            duration: t.duration || ''
                        });
                    }
                }
                if (data.account) {
                    metrics.balance = data.account.balance || metrics.balance;
                    metrics.equity = data.account.equity || metrics.equity;
                }
            } catch (e) {
                console.log('[SyncHybridFunding] Could not parse JSON data:', e.message);
            }
        }

        // Parse HTML table for trades (fallback)
        // Look for "Closed Deal History" or similar tables
        const tableMatch = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi);
        if (tableMatch && trades.length === 0) {
            for (const table of tableMatch) {
                // Check if this is the trades table
                if (table.toLowerCase().includes('symbol') &&
                    (table.toLowerCase().includes('profit') || table.toLowerCase().includes('p&l'))) {

                    // Extract rows
                    const rowMatches = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
                    if (rowMatches) {
                        // Skip header row
                        for (let i = 1; i < rowMatches.length; i++) {
                            const row = rowMatches[i];
                            const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);

                            if (cells && cells.length >= 10) {
                                // Extract cell values
                                const getCellValue = (cell: string): string => {
                                    return cell.replace(/<[^>]*>/g, '').trim();
                                };

                                // Table columns: SYMBOL, OPEN DATE, OPEN PRICE, CLOSE DATE, CLOSE PRICE, TYPE, STOP LOSS, TAKE PROFIT, LOTS, PROFIT, DURATION, DEAL
                                const symbol = getCellValue(cells[0]);
                                const openDate = getCellValue(cells[1]);
                                const openPrice = parseFloat(getCellValue(cells[2]).replace(/[^0-9.-]/g, '')) || 0;
                                const closeDate = getCellValue(cells[3]);
                                const closePrice = parseFloat(getCellValue(cells[4]).replace(/[^0-9.-]/g, '')) || 0;
                                const type = getCellValue(cells[5]).toUpperCase();
                                const stopLoss = parseFloat(getCellValue(cells[6]).replace(/[^0-9.-]/g, '')) || null;
                                const takeProfit = parseFloat(getCellValue(cells[7]).replace(/[^0-9.-]/g, '')) || null;
                                const lots = parseFloat(getCellValue(cells[8]).replace(/[^0-9.-]/g, '')) || 0;
                                const profit = parseFloat(getCellValue(cells[9]).replace(/[^0-9.-]/g, '')) || 0;
                                const duration = cells[10] ? getCellValue(cells[10]) : '';
                                const dealId = cells[11] ? getCellValue(cells[11]) : `${symbol}_${openDate}`;

                                if (symbol && openDate) {
                                    trades.push({
                                        dealId,
                                        symbol,
                                        openDate,
                                        openPrice,
                                        closeDate,
                                        closePrice,
                                        type,
                                        stopLoss,
                                        takeProfit,
                                        lots,
                                        profit,
                                        duration
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }

        // Calculate total P&L
        metrics.totalProfitLoss = trades.reduce((sum, t) => sum + t.profit, 0);

    } catch (error) {
        console.error('[SyncHybridFunding] Parse error:', error);
    }

    return { trades, metrics };
}

Deno.serve(async (req) => {
    const startTime = Date.now();

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { connection_id, account_id, force_refresh = false } = await req.json();

        if (!connection_id && !account_id) {
            return Response.json({ error: 'connection_id or account_id required' }, { status: 400 });
        }

        // Get the broker connection
        let connection;
        if (connection_id) {
            const connections = await base44.entities.BrokerConnection.filter({ id: connection_id });
            if (connections.length === 0) {
                return Response.json({ error: 'Connection not found' }, { status: 404 });
            }
            connection = connections[0];
        } else {
            // Find by account number
            const connections = await base44.entities.BrokerConnection.filter({
                account_number: account_id,
                created_by: user.email
            });
            if (connections.length === 0) {
                return Response.json({ error: 'Connection not found for account' }, { status: 404 });
            }
            connection = connections[0];
        }

        // Verify ownership
        if (connection.created_by !== user.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Build the dashboard URL
        const accountId = connection.account_number || connection.username;
        const dashboardUrl = `https://hybridfundingdashboard.propaccount.com/es/overview?accountId=${accountId}`;

        console.log(`[SyncHybridFunding] Fetching dashboard for account: ${accountId}`);

        // Fetch the dashboard using browser-like headers
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
        };

        const response = await fetch(dashboardUrl, {
            method: 'GET',
            headers: fetchHeaders
        });

        if (!response.ok) {
            console.error(`[SyncHybridFunding] Dashboard fetch failed: ${response.status}`);
            return Response.json({
                success: false,
                error: `Failed to fetch dashboard: ${response.status}`,
                suggestion: 'The dashboard may require authentication or the URL might be incorrect'
            }, { status: response.status });
        }

        const html = await response.text();
        console.log(`[SyncHybridFunding] Fetched ${html.length} bytes of HTML`);

        // Parse the dashboard
        const { trades: dashboardTrades, metrics } = parseHybridFundingDashboard(html);
        console.log(`[SyncHybridFunding] Parsed ${dashboardTrades.length} trades`);

        // Get existing trades to avoid duplicates
        const existingTrades = await base44.entities.Trade.filter({
            broker_connection_id: connection.id
        });

        const existingByDealId = new Map(
            existingTrades.filter(t => t.broker_trade_id).map(t => [t.broker_trade_id, t])
        );

        let imported = 0;
        let updated = 0;
        let skipped = 0;
        const errors: any[] = [];

        // Process each trade from dashboard
        for (const dt of dashboardTrades) {
            try {
                const dealId = dt.dealId || `hf_${dt.symbol}_${dt.openDate}`;

                // Check if trade exists
                if (existingByDealId.has(dealId)) {
                    const existing = existingByDealId.get(dealId);

                    // Update if P&L changed or trade was closed
                    if (force_refresh || Math.abs((existing.pnl || 0) - dt.profit) > 0.01) {
                        await base44.entities.Trade.update(existing.id, {
                            exit_date: dt.closeDate,
                            exit_price: dt.closePrice,
                            pnl: dt.profit,
                            stop_loss: dt.stopLoss,
                            take_profit: dt.takeProfit
                        });
                        updated++;
                    } else {
                        skipped++;
                    }
                    continue;
                }

                // Create new trade
                await base44.entities.Trade.create({
                    symbol: dt.symbol,
                    side: dt.type === 'BUY' ? 'Long' : 'Short',
                    quantity: dt.lots,
                    entry_price: dt.openPrice,
                    exit_price: dt.closePrice,
                    entry_date: dt.openDate,
                    exit_date: dt.closeDate,
                    pnl: dt.profit,
                    pnl_net: dt.profit, // Assuming net = gross for now
                    stop_loss: dt.stopLoss,
                    take_profit: dt.takeProfit,
                    platform: 'DXTrade',
                    instrument_type: 'Forex',
                    broker_connection_id: connection.id,
                    broker_trade_id: dealId,
                    import_source: 'Hybrid Funding Dashboard',
                    trade_status: 'closed'
                });
                imported++;

            } catch (tradeError) {
                errors.push({
                    trade: dt.symbol,
                    error: tradeError.message
                });
            }
        }

        // Update connection with latest data
        await base44.entities.BrokerConnection.update(connection.id, {
            last_sync: new Date().toISOString(),
            account_balance: metrics.balance || connection.account_balance,
            account_equity: metrics.equity || connection.account_equity,
            status: 'connected',
            error_message: null
        });

        // Create sync log
        await base44.entities.SyncLog.create({
            broker_connection_id: connection.id,
            sync_type: 'dashboard_scrape',
            status: errors.length > 0 ? 'partial' : 'success',
            trades_fetched: dashboardTrades.length,
            trades_imported: imported,
            trades_updated: updated,
            trades_skipped: skipped,
            errors: errors.length > 0 ? errors : undefined,
            duration_ms: Date.now() - startTime,
            sync_timestamp: new Date().toISOString()
        });

        console.log(`[SyncHybridFunding] Sync complete: ${imported} imported, ${updated} updated, ${skipped} skipped`);

        return Response.json({
            success: true,
            imported,
            updated,
            skipped,
            total_trades: dashboardTrades.length,
            metrics,
            errors: errors.length > 0 ? errors : undefined,
            duration_ms: Date.now() - startTime
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('[SyncHybridFunding] Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
});
