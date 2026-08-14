import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { callCTraderMcp } from '../../shared/ctraderMcpClient.ts';

/**
 * Bridge to cTrader's Remote MCP server.
 * Lets the journal (and AI clients via MCP) call cTrader tools headlessly:
 * get_balance, get_positions, get_deals, get_symbol_price, get_trendbars,
 * create_order, cancel_order, close_position, modify_order, etc.
 *
 * The user's cTrader BrokerConnection must carry settings_json.mcp_url
 * (the Remote MCP endpoint from cTrader Web) and optionally settings_json.mcp_token
 * (the bearer token) — or secret_ref holding the token.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { connection_id, tool, arguments: args = {}, list_tools = false } = await req
      .json()
      .catch(() => ({}));

    if (!connection_id) {
      return Response.json({ error: 'Missing connection_id' }, { status: 400 });
    }

    const conns = await base44.entities.BrokerConnection.filter({
      id: connection_id,
      created_by: user.email,
    });
    if (!conns.length) return Response.json({ error: 'Connection not found' }, { status: 404 });
    const conn = conns[0];
    const isCTrader = conn.broker_id === 'ctrader' || conn.provider === 'cTrader';
    if (!isCTrader) {
      return Response.json({ error: 'Connection is not a cTrader connection' }, { status: 400 });
    }

    const mcpUrl = conn.mcp_url || conn.settings_json?.mcp_url;
    const mcpToken = conn.mcp_token || conn.settings_json?.mcp_token || conn.secret_ref || conn.api_secret || null;
    if (!mcpUrl) {
      return Response.json(
        {
          error:
            'No cTrader MCP URL configured on this connection. Add settings_json.mcp_url (from cTrader Web → Remote MCP setup) in Broker Sync.',
        },
        { status: 400 }
      );
    }

    let method;
    let params;
    if (list_tools || tool === 'list_tools' || !tool) {
      method = 'tools/list';
      params = {};
    } else {
      method = 'tools/call';
      params = { name: tool, arguments: args || {} };
    }

    const result = await callCTraderMcp(mcpUrl, mcpToken, method, params);
    if (result?.error) {
      return Response.json({ error: 'cTrader MCP error', detail: result.error }, { status: 502 });
    }

    return Response.json({
      success: true,
      tool: method === 'tools/list' ? 'list_tools' : tool,
      result: result?.result ?? result,
    });
  } catch (error) {
    console.error('[ctraderMcp] error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});