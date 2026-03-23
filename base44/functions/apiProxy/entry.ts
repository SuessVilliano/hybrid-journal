import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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

    // Make the external API call
    const externalResponse = await fetch(payload.url, {
      method: payload.method,
      headers: payload.headers || {},
      body: payload.body ? JSON.stringify(payload.body) : undefined
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