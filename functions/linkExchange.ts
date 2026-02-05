import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// CORS headers for cross-origin requests from HybridCopy
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
        const base44 = createClientFromRequest(req);

        const { linkToken, sourceSystem, sourceUrl } = await req.json();

        if (!linkToken) {
            return Response.json({ error: 'Missing linkToken' }, { status: 400, headers: corsHeaders });
        }

        // Find the token (use asServiceRole since this might be called without user auth)
        const tokens = await base44.asServiceRole.entities.AppLinkToken.filter({
            token: linkToken
        });

        if (tokens.length === 0) {
            return Response.json({ error: 'Invalid token' }, { status: 404, headers: corsHeaders });
        }

        const tokenRecord = tokens[0];

        // Check if already used
        if (tokenRecord.used_at) {
            return Response.json({ error: 'Token already used' }, { status: 400, headers: corsHeaders });
        }

        // Check if expired
        const now = new Date();
        const expiresAt = new Date(tokenRecord.expires_at);

        if (now > expiresAt) {
            return Response.json({ error: 'Token expired' }, { status: 400, headers: corsHeaders });
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
        // Default to 'HybridCopy' for new connections (replacing legacy 'iCopyTrade')
        await base44.asServiceRole.entities.ConnectedApp.create({
            user_id: tokenRecord.user_id,
            user_email: tokenRecord.created_by,
            app_name: sourceSystem || tokenRecord.target_app || 'HybridCopy',
            signing_secret_ref: sharedSigningSecret,
            status: 'active',
            total_events_received: 0
        });

        console.log(`[LinkExchange] Successfully linked ${sourceSystem || 'HybridCopy'} for user ${tokenRecord.created_by}`);

        // Return EXACTLY what HybridCopy expects (nothing more)
        return Response.json({
            journalUserId: tokenRecord.user_id,
            sharedSigningSecret: sharedSigningSecret
        }, { headers: corsHeaders });

    } catch (error) {
        console.error('[LinkExchange] Error:', error);
        return Response.json({
            error: error.message
        }, { status: 500, headers: corsHeaders });
    }
});