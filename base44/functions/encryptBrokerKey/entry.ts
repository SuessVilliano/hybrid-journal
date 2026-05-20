// Encrypts broker credentials server-side before they're persisted on a
// BrokerConnection. Called by BrokerSetupWizard and BrokerConnectionForm
// from the browser; the encryption key (SECRET_VAULT_KEY) stays server-side.
//
// Body: { api_key?: string, api_secret?: string }
// Response: { api_key?: string (encrypted), api_secret?: string (encrypted),
//             encrypted_at_rest: boolean }

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { encryptSecret } from './helpers/secrets.js';

Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });

        const body = await req.json().catch(() => ({}));
        const out: Record<string, unknown> = {};

        if (body.api_key) out.api_key = await encryptSecret(String(body.api_key));
        if (body.api_secret) out.api_secret = await encryptSecret(String(body.api_secret));

        // Whether the encryption key is actually configured. The UI can show a
        // "secrets stored in plaintext until SECRET_VAULT_KEY is set" warning.
        out.encrypted_at_rest = !!Deno.env.get('SECRET_VAULT_KEY');

        return Response.json(out, { headers: corsHeaders });
    } catch (error) {
        console.error('[encryptBrokerKey] error:', error);
        return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
});
