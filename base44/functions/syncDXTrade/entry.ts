import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Sync trades from DXtrade account to HybridJournal

interface DXTradeSession {
    cookies: string;
    csrfToken: string;
    baseUrl: string;
}

// Login to DXtrade
async function dxtradeLogin(username: string, password: string, server: string): Promise<DXTradeSession> {
    let baseUrl = server;
    if (!server.startsWith('http')) {
        if (server.includes('.')) {
            baseUrl = `https://dxtrade.${server}`;
        } else {
            baseUrl = `https://dxtrade.${server}.com`;
        }
    }
    baseUrl = baseUrl.replace(/\/$/, '');

    console.log(`[SyncDXTrade] Logging in to ${baseUrl}`);

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            username,
            password,
            vendor: server.replace(/\.[^.]+$/, '').replace('dxtrade.', '')
        })
    });

    if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        throw new Error(`DXtrade login failed: ${loginResponse.status} - ${errorText}`);
    }

    // Extract cookies
    const setCookieHeaders = loginResponse.headers.getSetCookie?.() || [];
    let cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');

    if (!cookies) {
        const cookieHeader = loginResponse.headers.get('set-cookie');
        if (cookieHeader) {
            cookies = cookieHeader.split(',').map(c => c.split(';')[0].trim()).join('; ');
        }
    }

    // Get CSRF token
    let csrfToken = '';
    try {
        const mainPageResponse = await fetch(baseUrl, {
            headers: { 'Cookie': cookies }
        });
        const html = await mainPageResponse.text();
        const csrfMatch = html.match(/<meta\s+name=["']csrf["']\s+content=["']([^"']+)["']/i);
        if (csrfMatch) {
            csrfToken = csrfMatch[1];
        }
    } catch (e) {
        console.warn(`[SyncDXTrade] Could not fetch CSRF token: ${e.message}`);
    }

    return { cookies, csrfToken, baseUrl };
}

// Fetch trade history from DXtrade
async function fetchTradeHistory(session: DXTradeSession, days: number = 30): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const response = await fetch(`${session.baseUrl}/api/history`, {
        method: 'POST',
        headers: {
            'Cookie': session.cookies,
            'x-csrf-token': session.csrfToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            types: ['ORDER', 'TRADE', 'POSITION']
        })
    });

    if (!response.ok) {
        console.error(`[SyncDXTrade] History fetch failed: ${response.status}`);
        return [];
    }

    const data = await response.json();
    return data.trades || data.history || data || [];
}

// Fetch account info from DXtrade
async function fetchAccountInfo(session: DXTradeSession): Promise<any> {
    try {
        const response = await fetch(`${session.baseUrl}/api/account`, {
            method: 'GET',
            headers: {
                'Cookie': session.cookies,
                'x-csrf-token': session.csrfToken,
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            return response.json();
        }
    } catch (e) {
        console.warn(`[SyncDXTrade] Could not fetch account info: ${e.message}`);
    }
    return null;
}

Deno.serve(async (req) => {
    const startTime = Date.now();

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

        const { connection_id, days = 30 } = await req.json();

        if (!connection_id) {
            return Response.json({ error: 'Missing connection_id' }, { status: 400 });
        }

        // Get broker connection
        const connections = await base44.entities.BrokerConnection.filter({
            id: connection_id
        });

        if (connections.length === 0) {
            return Response.json({ error: 'Connection not found' }, { status: 404 });
        }

        const connection = connections[0];

        // Verify ownership
        if (connection.created_by !== user.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Verify it's a DXtrade connection
        if (connection.broker_id !== 'dxtrade') {
            return Response.json({ error: 'Not a DXtrade connection' }, { status: 400 });
        }

        console.log(`[SyncDXTrade] Starting sync for connection ${connection_id}`);

        // Login to DXtrade
        const session = await dxtradeLogin(
            connection.account_number || connection.username,
            connection.api_secret || connection.password,
            connection.server
        );

        // Fetch trade history
        const rawTrades = await fetchTradeHistory(session, days);
        console.log(`[SyncDXTrade] Fetched ${rawTrades.length} trades from DXtrade`);

        // Fetch account info
        const accountInfo = await fetchAccountInfo(session);

        // Get existing trades for this connection
        const existingTrades = await base44.entities.Trade.filter({
            broker_connection_id: connection_id
        });

        const existingByBrokerId = new Map(
            existingTrades.filter(t => t.broker_trade_id).map(t => [t.broker_trade_id, t])
        );

        let imported = 0;
        let updated = 0;
        let skipped = 0;
        const errors: any[] = [];

        // Process each trade
        for (const rawTrade of rawTrades) {
            try {
                const tradeId = rawTrade.id || rawTrade.tradeId || rawTrade.positionId || `dxtrade_${rawTrade.openTime}_${rawTrade.symbol}`;
                const symbol = rawTrade.symbol || rawTrade.instrument || '';
                const side = (rawTrade.side || rawTrade.orderSide || '').toUpperCase() === 'BUY' ? 'Long' : 'Short';
                const quantity = parseFloat(rawTrade.quantity || rawTrade.amount || rawTrade.size || 0);
                const entryPrice = parseFloat(rawTrade.entryPrice || rawTrade.openPrice || rawTrade.avgEntryPrice || 0);
                const exitPrice = parseFloat(rawTrade.exitPrice || rawTrade.closePrice || rawTrade.avgExitPrice || 0);
                const pnl = parseFloat(rawTrade.pnl || rawTrade.profit || rawTrade.realizedPnl || 0);
                const commission = parseFloat(rawTrade.commission || rawTrade.fees || 0);
                const swap = parseFloat(rawTrade.swap || rawTrade.financing || 0);
                const entryDate = rawTrade.openTime || rawTrade.entryTime || rawTrade.createdAt;
                const exitDate = rawTrade.closeTime || rawTrade.exitTime || rawTrade.closedAt;

                // Skip if no symbol or dates
                if (!symbol || !entryDate) {
                    skipped++;
                    continue;
                }

                // Check if trade exists
                if (existingByBrokerId.has(tradeId)) {
                    const existing = existingByBrokerId.get(tradeId);

                    // Update if trade was closed or PnL changed
                    if ((!existing.exit_date && exitDate) || Math.abs((existing.pnl || 0) - pnl) > 0.01) {
                        await base44.entities.Trade.update(existing.id, {
                            exit_date: exitDate || existing.exit_date,
                            exit_price: exitPrice || existing.exit_price,
                            pnl: pnl,
                            commission: commission || existing.commission,
                            swap: swap || existing.swap
                        });
                        updated++;
                    } else {
                        skipped++;
                    }
                    continue;
                }

                // Create new trade
                await base44.entities.Trade.create({
                    symbol,
                    side,
                    quantity,
                    entry_price: entryPrice,
                    exit_price: exitPrice || null,
                    entry_date: entryDate,
                    exit_date: exitDate || null,
                    pnl: pnl,
                    pnl_net: pnl - commission - swap,
                    commission,
                    swap,
                    platform: 'DXTrade',
                    instrument_type: 'Forex',
                    broker_connection_id: connection_id,
                    broker_trade_id: tradeId,
                    import_source: 'DXTrade API Sync',
                    trade_status: exitDate ? 'closed' : 'open'
                });
                imported++;

            } catch (tradeError) {
                errors.push({
                    trade: rawTrade.symbol || 'Unknown',
                    error: tradeError.message
                });
            }
        }

        // Update connection with latest sync info
        const updateData: any = {
            last_sync: new Date().toISOString(),
            status: 'connected'
        };

        if (accountInfo) {
            updateData.account_balance = accountInfo.balance || accountInfo.cash;
            updateData.account_equity = accountInfo.equity || accountInfo.balance;
        }

        await base44.entities.BrokerConnection.update(connection_id, updateData);

        // Create sync log
        await base44.entities.SyncLog.create({
            broker_connection_id: connection_id,
            sync_type: 'automatic',
            status: errors.length > 0 ? 'partial' : 'success',
            trades_fetched: rawTrades.length,
            trades_imported: imported,
            trades_updated: updated,
            trades_skipped: skipped,
            errors: errors.length > 0 ? errors : undefined,
            duration_ms: Date.now() - startTime,
            sync_timestamp: new Date().toISOString()
        });

        console.log(`[SyncDXTrade] Sync complete: ${imported} imported, ${updated} updated, ${skipped} skipped`);

        return Response.json({
            success: true,
            imported,
            updated,
            skipped,
            errors: errors.length > 0 ? errors : undefined,
            account_balance: accountInfo?.balance,
            account_equity: accountInfo?.equity,
            duration_ms: Date.now() - startTime
        });

    } catch (error) {
        console.error('[SyncDXTrade] Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
