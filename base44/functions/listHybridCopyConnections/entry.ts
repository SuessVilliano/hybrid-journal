import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Calls HybridCopy's /api/functions/listConnections and returns the
 * provider connections available to the current user, plus their current
 * sync state in the journal (last_sync, sync_enabled).
 *
 * Used by:
 *   - HybridCopySettings page → "Connections" panel
 *   - Auto-sync-on-login flow (refreshes anything older than 15 min)
 */

const HYBRIDCOPY_BASE =
    Deno.env.get('HYBRIDCOPY_BASE_URL') || 'https://hybridcopy.co';

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Find the active HybridCopy app for this user — that gives us the
        // user's HybridCopy access token.
        const apps = await base44.asServiceRole.entities.ConnectedApp.filter({
            user_email: user.email,
            app_name: 'HybridCopy',
            status: 'active'
        });

        if (apps.length === 0) {
            return Response.json({
                connections: [],
                linked: false,
                hint: 'No active HybridCopy connection. Generate a link token first.'
            });
        }

        const app = apps[0];

        let remoteConnections: any[] = [];
        try {
            const resp = await fetch(`${HYBRIDCOPY_BASE}/api/functions/listConnections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${app.access_token || app.signing_secret_ref}`
                },
                body: JSON.stringify({ user_id: user.id })
            });
            if (resp.ok) {
                const data = await resp.json();
                remoteConnections = data.connections || data.data || [];
            }
        } catch (err) {
            console.warn('[listHybridCopyConnections] remote fetch failed:', err.message);
        }

        // Merge with local sync state.
        const journalLinks = await base44.asServiceRole.entities.JournalLink.filter({
            user_email: user.email
        }).catch(() => []);

        const merged = remoteConnections.map((rc: any) => {
            const link = journalLinks.find(
                (l: any) =>
                    l.provider === rc.provider &&
                    l.account_external_id === rc.account_external_id
            );
            return {
                provider: rc.provider,
                account_name: rc.account_name || rc.account_external_id,
                account_external_id: rc.account_external_id,
                last_sync: link?.last_sync_at || null,
                sync_enabled: link?.sync_enabled ?? true,
                stale: link?.last_sync_at
                    ? Date.now() - new Date(link.last_sync_at).getTime() > 15 * 60 * 1000
                    : true
            };
        });

        return Response.json(
            { connections: merged, linked: true },
            { headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    } catch (error) {
        return Response.json(
            { error: error.message },
            { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }
});
