import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        const { linkToken } = await req.json();

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
        const sharedSecret = Array.from(secretBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        // Hash the secret for verification (SHA-256)
        const encoder = new TextEncoder();
        const data = encoder.encode(sharedSecret);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const secretHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Mark token as used
        await base44.asServiceRole.entities.AppLinkToken.update(tokenRecord.id, {
            used_at: new Date().toISOString()
        });

        // Create ConnectedApp record
        const connectedApp = await base44.asServiceRole.entities.ConnectedApp.create({
            user_id: tokenRecord.user_id,
            user_email: tokenRecord.created_by,
            app_name: tokenRecord.target_app || 'iCopyTrade',
            signing_secret_ref: `secret_${Date.now()}`, // In production, encrypt and store in vault
            signing_secret_hash: secretHash,
            status: 'active',
            total_events_received: 0
        });

        return Response.json({
            status: 'success',
            journalUserId: tokenRecord.user_id,
            journalUserEmail: tokenRecord.created_by,
            sharedSigningSecret: sharedSecret,
            connectedAppId: connectedApp.id,
            message: 'Connection established. Store the signing secret securely - it will not be shown again.'
        });

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});