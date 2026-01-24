import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { connectionId } = await req.json();

        if (!connectionId) {
            return Response.json({ error: 'Missing connectionId' }, { status: 400 });
        }

        // Get connection details
        const connections = await base44.entities.BrokerConnection.filter({
            id: connectionId,
            created_by: user.email
        });

        if (connections.length === 0) {
            return Response.json({ error: 'Connection not found' }, { status: 404 });
        }

        const connection = connections[0];

        // For now, this is a placeholder that would call the appropriate adapter
        // based on connection.mode and connection.provider
        
        // Update connection status
        await base44.entities.BrokerConnection.update(connectionId, {
            last_sync_at: new Date().toISOString(),
            status: 'connected'
        });

        // Log the sync attempt
        await base44.entities.SyncEventLog.create({
            event_id: `manual_sync_${connectionId}_${Date.now()}`,
            connection_id: connectionId,
            user_email: user.email,
            event_type: 'manual.import',
            source: connection.provider,
            payload: { manual: true },
            status: 'processed',
            processed_at: new Date().toISOString()
        });

        return Response.json({
            status: 'success',
            message: 'Manual sync triggered',
            connectionId
        });

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});