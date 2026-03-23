import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Proxy fetch function to bypass CORS and host restrictions
// Used for fetching external dashboards that block direct server requests

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            }
        });
    }

    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { url, method = 'GET', headers = {}, body } = await req.json();

        if (!url) {
            return Response.json({ error: 'URL is required' }, { status: 400 });
        }

        // Validate URL is from allowed domains
        const allowedDomains = [
            'hybridfundingdashboard.propaccount.com',
            'propaccount.com',
            'gooeytrade.com',
            'dxtrade.ftmo.com',
            'dxtrade.fundednext.com',
            'dxtrade.thefundedtrader.com',
            'dxtrade.e8funding.com'
        ];

        const urlObj = new URL(url);
        const isAllowed = allowedDomains.some(domain =>
            urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
        );

        if (!isAllowed) {
            return Response.json({
                error: 'Domain not allowed',
                domain: urlObj.hostname
            }, { status: 403 });
        }

        console.log(`[ProxyFetch] Fetching: ${url}`);

        // Add browser-like headers to avoid bot detection
        const fetchHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            ...headers
        };

        const fetchOptions: RequestInit = {
            method,
            headers: fetchHeaders,
        };

        if (body && method !== 'GET') {
            fetchOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url, fetchOptions);

        // Get response content
        const contentType = response.headers.get('content-type') || '';
        let content;

        if (contentType.includes('application/json')) {
            content = await response.json();
        } else {
            content = await response.text();
        }

        return Response.json({
            success: true,
            status: response.status,
            statusText: response.statusText,
            contentType,
            content,
            headers: Object.fromEntries(response.headers.entries())
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error('[ProxyFetch] Error:', error);
        return Response.json({
            success: false,
            error: error.message
        }, {
            status: 500,
            headers: {
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
});
