import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * testHybridCopySync
 *
 * Triggers a one-time pull from HybridCopy for the current user and
 * reports row counts per provider. Powers the "Test HybridCopy Sync"
 * button in journal Settings.
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
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

        const apps = await base44.asServiceRole.entities.ConnectedApp.filter({
            user_email: user.email,
            app_name: 'HybridCopy',
            status: 'active'
        });
        if (apps.length === 0) {
            return Response.json(
                { error: 'No active HybridCopy connection. Generate a link token first.' },
                { status: 400 }
            );
        }
        const app = apps[0];

        // Ask HybridCopy for the current trades + snapshots.
        let providerCounts: Record<string, { trades: number; snapshots: number }> = {};
        let errors: string[] = [];

        try {
            const resp = await fetch(`${HYBRIDCOPY_BASE}/api/functions/listConnections`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${app.access_token || app.signing_secret_ref}`
                },
                body: JSON.stringify({ user_id: user.id })
            });

            if (!resp.ok) {
                errors.push(`listConnections HTTP ${resp.status}`);
            } else {
                const { connections = [] } = await resp.json();

                for (const conn of connections) {
                    try {
                        const pull = await fetch(`${HYBRIDCOPY_BASE}/api/functions/syncToJournal`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${app.access_token || app.signing_secret_ref}`
                            },
                            body: JSON.stringify({
                                user_id: user.id,
                                provider: conn.provider,
                                account_external_id: conn.account_external_id,
                                force: true
                            })
                        });
                        if (pull.ok) {
                            const r = await pull.json();
                            const key = conn.provider;
                            providerCounts[key] = providerCounts[key] || { trades: 0, snapshots: 0 };
                            providerCounts[key].trades += r.trades_created || 0;
                            providerCounts[key].trades += r.trades_updated || 0;
                            providerCounts[key].snapshots += r.snapshots_created || 0;
                            providerCounts[key].snapshots += r.snapshots_updated || 0;
                        } else {
                            errors.push(`${conn.provider}: HTTP ${pull.status}`);
                        }
                    } catch (err) {
                        errors.push(`${conn.provider}: ${err.message}`);
                    }
                }
            }
        } catch (err) {
            errors.push(err.message);
        }

        return Response.json(
            {
                ok: errors.length === 0,
                providerCounts,
                errors,
                tested_at: new Date().toISOString()
            },
            { headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
