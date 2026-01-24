import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const { linkToken, sourceSystem, sourceUrl } = await req.json();

        if (!linkToken) {
            return Response.json({ error: 'Missing linkToken' }, { status: 400 });
        }

        // Find the token (use asServiceRole since this might be called without user auth)
        const tokens = await base44.asServiceRole.entities.AppLinkToken.filter({
            token: linkToken
        });

        if (tokens.length === 0) {
            return Response.json({ error: 'Invalid token' }, { status: 404 });
        }

        const tokenRecord = tokens[0];

        // Check if already used
        if (tokenRecord.used_at) {
            return Response.json({ error: 'Token already used' }, { status: 400 });
        }

        // Check if expired
        const now = new Date();
        const expiresAt = new Date(tokenRecord.expires_at);

        if (now > expiresAt) {
            return Response.json({ error: 'Token expired' }, { status: 400 });
        }

        // Generate shared signing secret (32 bytes = 64 hex chars)
        const secretBytes = new Uint8Array(32);
        crypto.getRandomValues(secretBytes);
        const sharedSigningSecret = Array.from(secretBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // Mark token as used
        await base44.asServiceRole.entities.AppLinkToken.update(tokenRecord.id, {
            used_at: new Date().toISOString()
        });

        // Create ConnectedApp record (store the actual secret for HMAC verification)
        await base44.asServiceRole.entities.ConnectedApp.create({
            user_id: tokenRecord.user_id,
            user_email: tokenRecord.created_by,
            app_name: sourceSystem || tokenRecord.target_app || 'iCopyTrade',
            signing_secret_ref: sharedSigningSecret,
            status: 'active',
            total_events_received: 0
        });

        // Return EXACTLY what HybridCopy expects (nothing more)
        return Response.json({
            journalUserId: tokenRecord.user_id,
            sharedSigningSecret: sharedSigningSecret
        });

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});