import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * connectHybridCopy
 *
 * UI flow for linking a HybridCopy provider connection into the journal.
 *
 * Two operations:
 *   - action='toggle'  → enable/disable sync for an existing journal link
 *   - action='create'  → call HybridCopy's connectJournal function to
 *                        create a journal link record on their side, then
 *                        mirror it locally as a JournalLink row.
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

        const { action, provider, account_external_id, sync_enabled } = await req.json();

        const apps = await base44.asServiceRole.entities.ConnectedApp.filter({
            user_email: user.email,
            app_name: 'HybridCopy',
            status: 'active'
        });
        if (apps.length === 0) {
            return Response.json(
                {
                    error: 'No active HybridCopy connection. Generate a link token first.'
                },
                { status: 400 }
            );
        }
        const app = apps[0];

        if (action === 'toggle') {
            const links = await base44.asServiceRole.entities.JournalLink.filter({
                user_email: user.email,
                provider,
                account_external_id
            }).catch(() => []);

            if (links.length > 0) {
                await base44.asServiceRole.entities.JournalLink.update(links[0].id, {
                    sync_enabled: !!sync_enabled
                });
            } else {
                await base44.asServiceRole.entities.JournalLink.create({
                    user_email: user.email,
                    provider,
                    account_external_id,
                    sync_enabled: !!sync_enabled,
                    connected_app_id: app.id
                });
            }

            return Response.json(
                { ok: true, action: 'toggle', provider, account_external_id, sync_enabled: !!sync_enabled },
                { headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        if (action === 'create') {
            // Tell HybridCopy: create a journal link record for this connection.
            let remoteLink: any = null;
            try {
                const resp = await fetch(`${HYBRIDCOPY_BASE}/api/functions/connectJournal`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${app.access_token || app.signing_secret_ref}`
                    },
                    body: JSON.stringify({
                        user_id: user.id,
                        provider,
                        account_external_id,
                        journal_app_id: app.id,
                        callback_url: `https://hybridjournal.co/api/functions/receiveFromHybridCopy`
                    })
                });
                if (resp.ok) {
                    remoteLink = await resp.json();
                } else {
                    return Response.json(
                        { error: `HybridCopy connectJournal failed: ${resp.status}` },
                        { status: 502 }
                    );
                }
            } catch (err) {
                return Response.json({ error: err.message }, { status: 502 });
            }

            // Mirror locally so the journal can show last_sync etc.
            const existing = await base44.asServiceRole.entities.JournalLink.filter({
                user_email: user.email,
                provider,
                account_external_id
            }).catch(() => []);

            const linkData = {
                user_email: user.email,
                provider,
                account_external_id,
                connected_app_id: app.id,
                sync_enabled: true,
                hybridcopy_link_id: remoteLink?.id || remoteLink?.link_id || null
            };

            if (existing.length > 0) {
                await base44.asServiceRole.entities.JournalLink.update(existing[0].id, linkData);
            } else {
                await base44.asServiceRole.entities.JournalLink.create(linkData);
            }

            return Response.json(
                { ok: true, action: 'create', remote: remoteLink },
                { headers: { 'Access-Control-Allow-Origin': '*' } }
            );
        }

        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
