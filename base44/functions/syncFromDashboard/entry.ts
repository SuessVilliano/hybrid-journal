import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Generic dashboard sync function
// Routes to appropriate prop firm-specific parser based on connection details

// Supported prop firms and their dashboard URL patterns
const PROP_FIRM_DASHBOARDS: Record<string, {
    name: string;
    urlPattern: (accountId: string) => string;
    publicUrlPattern?: RegExp;
}> = {
    'hybridfunding': {
        name: 'Hybrid Funding',
        urlPattern: (accountId) => `https://hybridfundingdashboard.propaccount.com/es/overview?accountId=${accountId}`,
        publicUrlPattern: /hybridfundingdashboard\.propaccount\.com/
    },
    'ftmo': {
        name: 'FTMO',
        urlPattern: (accountId) => `https://trader.ftmo.com/trading-journal/${accountId}`,
        publicUrlPattern: /trader\.ftmo\.com/
    },
    'fundednext': {
        name: 'Funded Next',
        urlPattern: (accountId) => `https://fundednext.com/user/dashboard/${accountId}`,
        publicUrlPattern: /fundednext\.com/
    },
    'thefundedtrader': {
        name: 'The Funded Trader',
        urlPattern: (accountId) => `https://thefundedtraderprogram.com/dashboard/${accountId}`,
        publicUrlPattern: /thefundedtrader/
    },
    'e8funding': {
        name: 'E8 Funding',
        urlPattern: (accountId) => `https://e8funding.com/dashboard/${accountId}`,
        publicUrlPattern: /e8funding\.com/
    }
};

// Detect prop firm from server/URL
function detectPropFirm(server: string, platformUrl?: string): string | null {
    const checkUrl = (server || platformUrl || '').toLowerCase();

    for (const [key, config] of Object.entries(PROP_FIRM_DASHBOARDS)) {
        if (config.publicUrlPattern?.test(checkUrl) ||
            checkUrl.includes(key) ||
            checkUrl.includes(config.name.toLowerCase().replace(/\s+/g, ''))) {
            return key;
        }
    }

    // Check for gooeytrade which is Hybrid Funding
    if (checkUrl.includes('gooeytrade') || checkUrl.includes('gooey')) {
        return 'hybridfunding';
    }

    return null;
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

        const {
            connection_id,
            dashboard_url,
            prop_firm,
            force_refresh = false
        } = await req.json();

        // If dashboard_url is provided directly, use it
        if (dashboard_url) {
            console.log(`[SyncFromDashboard] Direct URL provided: ${dashboard_url}`);

            // Detect prop firm from URL
            const detectedFirm = detectPropFirm(dashboard_url);

            if (detectedFirm === 'hybridfunding') {
                // Route to Hybrid Funding specific parser
                const response = await base44.functions.invoke('syncHybridFunding', {
                    connection_id,
                    force_refresh
                });
                return Response.json(response.data);
            }

            // For other prop firms, return not yet supported
            return Response.json({
                success: false,
                error: `Prop firm parser not yet implemented for: ${detectedFirm || 'unknown'}`,
                detected_firm: detectedFirm,
                supported_firms: Object.keys(PROP_FIRM_DASHBOARDS)
            }, { status: 400 });
        }

        // Get connection and detect prop firm
        if (!connection_id) {
            return Response.json({ error: 'connection_id or dashboard_url required' }, { status: 400 });
        }

        const connections = await base44.entities.BrokerConnection.filter({ id: connection_id });
        if (connections.length === 0) {
            return Response.json({ error: 'Connection not found' }, { status: 404 });
        }

        const connection = connections[0];

        // Verify ownership
        if (connection.created_by !== user.email) {
            return Response.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Detect which prop firm this is
        const detectedFirm = prop_firm ||
            detectPropFirm(connection.server || '', connection.platform_url);

        if (!detectedFirm) {
            return Response.json({
                success: false,
                error: 'Could not detect prop firm from connection details',
                server: connection.server,
                platform_url: connection.platform_url,
                supported_firms: Object.keys(PROP_FIRM_DASHBOARDS),
                hint: 'Try providing the dashboard_url directly or set prop_firm parameter'
            }, { status: 400 });
        }

        console.log(`[SyncFromDashboard] Detected prop firm: ${detectedFirm}`);

        // Route to appropriate sync function
        switch (detectedFirm) {
            case 'hybridfunding':
                const hfResponse = await base44.functions.invoke('syncHybridFunding', {
                    connection_id,
                    force_refresh
                });
                return Response.json(hfResponse.data, {
                    headers: { 'Access-Control-Allow-Origin': '*' }
                });

            default:
                // For unsupported prop firms, try to fall back to DXtrade API
                if (connection.broker_id === 'dxtrade' && connection.api_secret) {
                    console.log(`[SyncFromDashboard] Falling back to DXtrade API sync`);
                    const dxResponse = await base44.functions.invoke('syncDXTrade', {
                        connection_id
                    });
                    return Response.json(dxResponse.data, {
                        headers: { 'Access-Control-Allow-Origin': '*' }
                    });
                }

                return Response.json({
                    success: false,
                    error: `Prop firm "${detectedFirm}" dashboard parser not yet implemented`,
                    detected_firm: detectedFirm,
                    supported_firms: Object.keys(PROP_FIRM_DASHBOARDS),
                    suggestion: 'Try using DXtrade API sync instead or provide a public dashboard URL'
                }, {
                    status: 400,
                    headers: { 'Access-Control-Allow-Origin': '*' }
                });
        }

    } catch (error) {
        console.error('[SyncFromDashboard] Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
});
