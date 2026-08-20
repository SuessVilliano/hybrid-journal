import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// SSRF protection: reject non-HTTP protocols and private/internal IP ranges.
function isPrivateV4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => Number.isNaN(n) || n < 0 || n > 255)) return false;
  const [a, b] = parts;
  if (a === 10) return true;                          // 10.0.0.0/8
  if (a === 127) return true;                         // 127.0.0.0/8 loopback
  if (a === 0) return true;                           // 0.0.0.0/8
  if (a === 169 && b === 254) return true;            // 169.254.0.0/16 link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
  if (a === 192 && b === 168) return true;            // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true;  // 100.64.0.0/10 CGNAT
  return false;
}

function isPrivateV6(ip: string): boolean {
  const s = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (s === '::1') return true;                       // loopback
  if (s.startsWith('fe80')) return true;             // link-local
  if (s.startsWith('fc') || s.startsWith('fd')) return true; // unique-local
  if (s.startsWith('::ffff:')) {                      // IPv4-mapped IPv6
    const v4 = s.slice('::ffff:'.length);
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v4)) return isPrivateV4(v4);
  }
  return false;
}

async function assertSafeUrl(rawUrl: string): Promise<{ ok: true; url: URL } | { ok: false; status: number; error: string }> {
  let u: URL;
  try { u = new URL(rawUrl); } catch {
    return { ok: false, status: 400, error: 'Invalid URL' };
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return { ok: false, status: 400, error: 'Only http and https protocols are allowed' };
  }
  const host = u.hostname;
  const candidates: string[] = [];
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    candidates.push(host);
  } else if (host.includes(':')) {
    candidates.push(host.toLowerCase());
  } else {
    try {
      const a = await Deno.resolveDns(host, 'A');
      for (const ip of a) candidates.push(ip);
    } catch { /* ignore A failure */ }
    try {
      const aaaa = await Deno.resolveDns(host, 'AAAA');
      for (const ip of aaaa) candidates.push(ip.toLowerCase());
    } catch { /* ignore AAAA failure */ }
    if (candidates.length === 0) {
      return { ok: false, status: 400, error: 'Unable to resolve hostname' };
    }
  }
  for (const ip of candidates) {
    if (isPrivateV4(ip) || isPrivateV6(ip)) {
      return { ok: false, status: 400, error: 'Requests to private or internal addresses are not allowed' };
    }
  }
  return { ok: true, url: u };
}

// API endpoint to communicate with external APIs (proxy for CORS, auth, etc.)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate via API key
    const apiKey = req.headers.get('api_key');
    if (!apiKey) {
      return Response.json({ error: 'Missing api_key header' }, { status: 401 });
    }

    // Find user by API key
    const users = await base44.asServiceRole.entities.User.filter({ api_key: apiKey, api_key_enabled: true });
    if (!users || users.length === 0) {
      return Response.json({ error: 'Invalid or disabled API key' }, { status: 401 });
    }

    const user = users[0];
    const payload = await req.json();

    // Validate required fields
    if (!payload.url || !payload.method) {
      return Response.json({ 
        error: 'Missing required fields: url and method are required' 
      }, { status: 400 });
    }

    // Validate destination URL to prevent SSRF (block private/internal IPs and non-HTTP protocols)
    const destCheck = await assertSafeUrl(payload.url);
    if (!destCheck.ok) {
      return Response.json({ error: destCheck.error }, { status: destCheck.status });
    }

    // Make the external API call (disable redirect following to prevent SSRF via open redirects)
    const externalResponse = await fetch(destCheck.url, {
      method: payload.method,
      headers: payload.headers || {},
      body: payload.body ? JSON.stringify(payload.body) : undefined,
      redirect: 'error'
    });

    const responseData = await externalResponse.text();
    let parsedData;
    try {
      parsedData = JSON.parse(responseData);
    } catch {
      parsedData = responseData;
    }

    // Log the API call
    await base44.asServiceRole.entities.SyncLog.create({
      sync_type: 'webhook_signal',
      status: externalResponse.ok ? 'success' : 'failed',
      details: `External API call to ${payload.url} - Status: ${externalResponse.status}`,
      user_email: user.email
    });

    return Response.json({
      success: externalResponse.ok,
      status: externalResponse.status,
      data: parsedData,
      headers: Object.fromEntries(externalResponse.headers.entries())
    });

  } catch (error) {
    console.error('API Proxy error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});