import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// On-login sync function
// Triggers automatic sync for all connected broker accounts when user logs in
// This ensures users always see the freshest data

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

        console.log(`[OnLoginSync] Starting login sync for user: ${user.email}`);

        // Get all broker connections for this user
        const connections = await base44.entities.BrokerConnection.filter({
            created_by: user.email,
            status: 'connected'
        });

        if (connections.length === 0) {
            return Response.json({
                success: true,
                message: 'No connected broker accounts found',
                synced: 0
            }, {
                headers: { 'Access-Control-Allow-Origin': '*' }
            });
        }

        console.log(`[OnLoginSync] Found ${connections.length} connected accounts`);

        const results: any[] = [];
        let successCount = 0;
        let errorCount = 0;

        // Sync each connection
        for (const connection of connections) {
            try {
                // Check if last sync was recent (within 5 minutes) - skip if so
                const lastSync = connection.last_sync ? new Date(connection.last_sync) : null;
                const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);

                if (lastSync && lastSync.getTime() > fiveMinutesAgo) {
                    console.log(`[OnLoginSync] Skipping ${connection.account_number} - synced recently`);
                    results.push({
                        connection_id: connection.id,
                        account: connection.account_number,
                        broker: connection.broker_name,
                        status: 'skipped',
                        reason: 'Recently synced'
                    });
                    continue;
                }

                // Determine which sync function to use
                let syncFunction = 'syncBroker';
                let syncParams: any = { connection_id: connection.id };

                // Check for DXtrade connections
                if (connection.broker_id === 'dxtrade' ||
                    connection.connection_type === 'dxtrade_login') {
                    syncFunction = 'syncDXTrade';
                }

                // Check for Hybrid Funding (gooeytrade)
                const serverLower = (connection.server || '').toLowerCase();
                const platformUrlLower = (connection.platform_url || '').toLowerCase();

                if (serverLower.includes('gooeytrade') ||
                    serverLower.includes('hybridfunding') ||
                    platformUrlLower.includes('gooeytrade') ||
                    platformUrlLower.includes('hybridfunding') ||
                    platformUrlLower.includes('propaccount.com')) {
                    syncFunction = 'syncHybridFunding';
                }

                console.log(`[OnLoginSync] Syncing ${connection.account_number} via ${syncFunction}`);

                // Execute sync
                const response = await base44.functions.invoke(syncFunction, syncParams);

                results.push({
                    connection_id: connection.id,
                    account: connection.account_number,
                    broker: connection.broker_name,
                    status: 'success',
                    sync_function: syncFunction,
                    imported: response.data?.imported || 0,
                    updated: response.data?.updated || 0
                });
                successCount++;

            } catch (syncError) {
                console.error(`[OnLoginSync] Error syncing ${connection.account_number}:`, syncError.message);
                results.push({
                    connection_id: connection.id,
                    account: connection.account_number,
                    broker: connection.broker_name,
                    status: 'error',
                    error: syncError.message
                });
                errorCount++;
            }
        }

        console.log(`[OnLoginSync] Complete: ${successCount} success, ${errorCount} errors`);

        return Response.json({
            success: true,
            total_connections: connections.length,
            synced: successCount,
            errors: errorCount,
            skipped: connections.length - successCount - errorCount,
            results,
            duration_ms: Date.now() - startTime
        }, {
            headers: { 'Access-Control-Allow-Origin': '*' }
        });

    } catch (error) {
        console.error('[OnLoginSync] Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    }
});
