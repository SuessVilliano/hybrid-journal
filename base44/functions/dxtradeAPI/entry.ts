import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// DXtrade API Integration
// Supports login, session management, trade history, positions, and order execution

interface DXTradeCredentials {
    username: string;
    password: string;
    server: string; // e.g., "gooeytrade.com", "ftmo.com"
}

interface DXTradeSession {
    cookies: string;
    csrfToken: string;
    baseUrl: string;
}

interface DXTradePosition {
    positionCode: string;
    symbol: string;
    side: string;
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    openTime: string;
}

interface DXTradeTrade {
    tradeId: string;
    symbol: string;
    side: string;
    quantity: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
    commission: number;
    swap: number;
    openTime: string;
    closeTime: string;
}

// Login to DXtrade and get session
async function dxtradeLogin(credentials: DXTradeCredentials): Promise<DXTradeSession> {
    const { username, password, server } = credentials;

    // Build base URL - handle different server formats
    let baseUrl = server;
    if (!server.startsWith('http')) {
        // Check if it's just a domain or needs dxtrade prefix
        if (server.includes('.')) {
            baseUrl = `https://dxtrade.${server}`;
        } else {
            baseUrl = `https://dxtrade.${server}.com`;
        }
    }

    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/$/, '');

    console.log(`[DXtrade] Attempting login to ${baseUrl}`);

    // Step 1: Login to get session cookies
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            password: password,
            vendor: server.replace(/\.[^.]+$/, '').replace('dxtrade.', '') // Extract vendor name
        })
    });

    if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        console.error(`[DXtrade] Login failed: ${loginResponse.status} - ${errorText}`);
        throw new Error(`DXtrade login failed: ${loginResponse.status} - Invalid credentials or server`);
    }

    // Extract cookies from response
    const setCookieHeaders = loginResponse.headers.getSetCookie?.() || [];
    const cookies = setCookieHeaders.map(cookie => cookie.split(';')[0]).join('; ');

    if (!cookies) {
        // Try alternative cookie extraction
        const cookieHeader = loginResponse.headers.get('set-cookie');
        if (!cookieHeader) {
            throw new Error('DXtrade login succeeded but no session cookies received');
        }
    }

    console.log(`[DXtrade] Login successful, got session cookies`);

    // Step 2: Fetch CSRF token from main page
    let csrfToken = '';
    try {
        const mainPageResponse = await fetch(baseUrl, {
            headers: {
                'Cookie': cookies
            }
        });

        const html = await mainPageResponse.text();
        const csrfMatch = html.match(/<meta\s+name=["']csrf["']\s+content=["']([^"']+)["']/i);
        if (csrfMatch) {
            csrfToken = csrfMatch[1];
            console.log(`[DXtrade] Extracted CSRF token`);
        }
    } catch (e) {
        console.warn(`[DXtrade] Could not fetch CSRF token: ${e.message}`);
    }

    return {
        cookies,
        csrfToken,
        baseUrl
    };
}

// Fetch account information
async function dxtradeFetchAccount(session: DXTradeSession): Promise<any> {
    const response = await fetch(`${session.baseUrl}/api/account`, {
        method: 'GET',
        headers: {
            'Cookie': session.cookies,
            'x-csrf-token': session.csrfToken,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch account: ${response.status}`);
    }

    return response.json();
}

// Fetch open positions
async function dxtradeFetchPositions(session: DXTradeSession): Promise<DXTradePosition[]> {
    const response = await fetch(`${session.baseUrl}/api/positions`, {
        method: 'GET',
        headers: {
            'Cookie': session.cookies,
            'x-csrf-token': session.csrfToken,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        // Try WebSocket fallback or alternative endpoint
        console.warn(`[DXtrade] Positions endpoint returned ${response.status}, trying alternative`);
        return [];
    }

    const data = await response.json();
    return data.positions || data || [];
}

// Fetch trade history
async function dxtradeFetchTradeHistory(session: DXTradeSession, days: number = 30): Promise<DXTradeTrade[]> {
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
        const errorText = await response.text();
        console.error(`[DXtrade] History fetch failed: ${response.status} - ${errorText}`);
        throw new Error(`Failed to fetch trade history: ${response.status}`);
    }

    const data = await response.json();

    // Normalize the trade data
    const trades: DXTradeTrade[] = [];
    const rawTrades = data.trades || data.history || data || [];

    for (const trade of rawTrades) {
        trades.push({
            tradeId: trade.id || trade.tradeId || trade.positionId || `dxtrade_${Date.now()}_${Math.random()}`,
            symbol: trade.symbol || trade.instrument || '',
            side: (trade.side || trade.orderSide || '').toUpperCase() === 'BUY' ? 'Long' : 'Short',
            quantity: parseFloat(trade.quantity || trade.amount || trade.size || 0),
            entryPrice: parseFloat(trade.entryPrice || trade.openPrice || trade.avgEntryPrice || 0),
            exitPrice: parseFloat(trade.exitPrice || trade.closePrice || trade.avgExitPrice || 0),
            pnl: parseFloat(trade.pnl || trade.profit || trade.realizedPnl || 0),
            commission: parseFloat(trade.commission || trade.fees || 0),
            swap: parseFloat(trade.swap || trade.financing || 0),
            openTime: trade.openTime || trade.entryTime || trade.createdAt || '',
            closeTime: trade.closeTime || trade.exitTime || trade.closedAt || ''
        });
    }

    return trades;
}

// Execute a trade order
async function dxtradeExecuteOrder(
    session: DXTradeSession,
    params: {
        symbol: string;
        side: 'BUY' | 'SELL';
        quantity: number;
        orderType?: 'MARKET' | 'LIMIT';
        limitPrice?: number;
        stopLoss?: number;
        takeProfit?: number;
    }
): Promise<any> {
    const orderPayload = {
        instrument: params.symbol,
        orderSide: params.side,
        quantity: params.quantity,
        orderType: params.orderType || 'MARKET',
        limitPrice: params.orderType === 'LIMIT' ? params.limitPrice : -1,
        stopLoss: params.stopLoss || null,
        takeProfit: params.takeProfit || null,
        timeInForce: 'GTC',
        requestId: crypto.randomUUID()
    };

    const response = await fetch(`${session.baseUrl}/api/orders/single`, {
        method: 'POST',
        headers: {
            'Cookie': session.cookies,
            'x-csrf-token': session.csrfToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(orderPayload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Order execution failed: ${response.status} - ${errorText}`);
    }

    return response.json();
}

// Close a position
async function dxtradeClosePosition(session: DXTradeSession, positionCode: string): Promise<any> {
    const response = await fetch(`${session.baseUrl}/api/positions/close`, {
        method: 'POST',
        headers: {
            'Cookie': session.cookies,
            'x-csrf-token': session.csrfToken,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            positionCode: positionCode,
            requestId: crypto.randomUUID()
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Close position failed: ${response.status} - ${errorText}`);
    }

    return response.json();
}

// Main API handler
Deno.serve(async (req) => {
    // Handle CORS
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

        const body = await req.json();
        const { action, credentials, connectionId, orderParams, positionCode, days } = body;

        if (!action) {
            return Response.json({ error: 'Missing action parameter' }, { status: 400 });
        }

        let session: DXTradeSession;

        // Get credentials either from body or from stored connection
        if (credentials) {
            session = await dxtradeLogin(credentials);
        } else if (connectionId) {
            // Fetch stored credentials from BrokerConnection
            const connections = await base44.entities.BrokerConnection.filter({
                id: connectionId
            });

            if (connections.length === 0) {
                return Response.json({ error: 'Connection not found' }, { status: 404 });
            }

            const conn = connections[0];
            if (conn.created_by !== user.email) {
                return Response.json({ error: 'Unauthorized access to connection' }, { status: 403 });
            }

            session = await dxtradeLogin({
                username: conn.account_number || conn.username,
                password: conn.api_secret || conn.password,
                server: conn.server
            });
        } else {
            return Response.json({ error: 'Missing credentials or connectionId' }, { status: 400 });
        }

        let result;

        switch (action) {
            case 'login':
                // Just validate login
                result = { success: true, message: 'Login successful' };
                break;

            case 'account':
                result = await dxtradeFetchAccount(session);
                break;

            case 'positions':
                result = await dxtradeFetchPositions(session);
                break;

            case 'history':
                result = await dxtradeFetchTradeHistory(session, days || 30);
                break;

            case 'sync':
                // Full sync: fetch history and return formatted trades
                const trades = await dxtradeFetchTradeHistory(session, days || 30);
                const positions = await dxtradeFetchPositions(session);
                result = {
                    trades,
                    positions,
                    syncedAt: new Date().toISOString()
                };
                break;

            case 'execute':
                if (!orderParams) {
                    return Response.json({ error: 'Missing orderParams for execute action' }, { status: 400 });
                }
                result = await dxtradeExecuteOrder(session, orderParams);
                break;

            case 'close':
                if (!positionCode) {
                    return Response.json({ error: 'Missing positionCode for close action' }, { status: 400 });
                }
                result = await dxtradeClosePosition(session, positionCode);
                break;

            default:
                return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }

        return Response.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('[DXtrade API Error]', error);
        return Response.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
