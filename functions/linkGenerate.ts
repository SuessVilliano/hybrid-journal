import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { targetApp = 'iCopyTrade' } = await req.json();

        // Generate unique token (UUID v4)
        const token = crypto.randomUUID();

        // Set expiration to 15 minutes from now
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

        // Create token record
        const linkToken = await base44.entities.AppLinkToken.create({
            user_id: user.id,
            token,
            expires_at: expiresAt,
            target_app: targetApp,
            used_at: null
        });

        return Response.json({
            status: 'success',
            linkToken: token,
            expiresAt,
            expiresInSeconds: 900
        });

    } catch (error) {
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});