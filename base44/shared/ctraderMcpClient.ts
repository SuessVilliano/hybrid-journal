// Minimal MCP "streamable HTTP" client for cTrader's Remote MCP server.
// Shared by base44/functions/ctraderMcp and base44/functions/placeTrade
// so both speak the same protocol to cTrader.

/**
 * Call a method on a cTrader Remote MCP server.
 * Does an initialize handshake (capturing Mcp-Session-Id if present), then the call.
 * Falls through to a direct call if the server doesn't require initialization.
 *
 * @param mcpUrl   cTrader Remote MCP endpoint URL
 * @param mcpToken Bearer token (from cTrader Web Remote MCP setup); optional
 * @param method   JSON-RPC method e.g. "tools/list" or "tools/call"
 * @param params   params object for the method
 */
export async function callCTraderMcp(mcpUrl, mcpToken, method, params) {
  const baseHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    ...(mcpToken ? { Authorization: `Bearer ${mcpToken}` } : {}),
  };

  // 1) Initialize handshake (capture session id if the server uses one)
  let sessionId = null;
  try {
    const initResp = await fetch(mcpUrl, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'init',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'HybridJournal', version: '1.0' },
        },
      }),
    });
    if (initResp.ok) {
      sessionId =
        initResp.headers.get('mcp-session-id') ||
        initResp.headers.get('Mcp-Session-Id');
      // send the initialized notification (best effort)
      await fetch(mcpUrl, {
        method: 'POST',
        headers: { ...baseHeaders, ...(sessionId ? { 'mcp-session-id': sessionId } : {}) },
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      }).catch(() => {});
    }
  } catch (_e) {
    // Server may not require initialization; continue with direct call.
  }

  // 2) The actual call
  const callResp = await fetch(mcpUrl, {
    method: 'POST',
    headers: { ...baseHeaders, ...(sessionId ? { 'mcp-session-id': sessionId } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'call', method, params }),
  });

  if (!callResp.ok) {
    const errText = await callResp.text().catch(() => '');
    throw new Error(`cTrader MCP ${method} failed (${callResp.status}): ${errText.slice(0, 400)}`);
  }

  return parseMcpResponse(callResp);
}

async function parseMcpResponse(resp) {
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.includes('text/event-stream')) {
    const sseText = await resp.text();
    const dataLines = sseText
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim());
    for (const d of dataLines) {
      if (!d || d === '[DONE]') continue;
      try {
        return JSON.parse(d);
      } catch (_e) {
        // keep scanning
      }
    }
    return null;
  }
  return await resp.json();
}