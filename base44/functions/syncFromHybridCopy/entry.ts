import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Compatibility alias for /api/functions/syncFromHybridCopy.
 *
 * The canonical implementation lives in receiveFromHybridCopy. We re-export
 * the same handler here so HybridCopy clients pointing at the older path
 * keep working without code changes.
 */

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
        headers[key] = value;
    });

    const body = await req.text();

    try {
        const response = await base44.functions.invoke('receiveFromHybridCopy', body ? JSON.parse(body) : {}, {
            headers
        });
        return Response.json(response.data, {
            status: response.status || 200,
            headers: { 'Access-Control-Allow-Origin': '*' }
        });
    } catch (err) {
        return Response.json(
            { error: err.message },
            { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
        );
    }
});
