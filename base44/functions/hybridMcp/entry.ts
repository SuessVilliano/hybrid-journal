// hybridMcp — token-authenticated MCP "streamable HTTP" server for Hybrid Journal.
//
// Lets headless external projects (e.g. a Command Center API on Render, or any MCP
// client like ChatGPT/Claude/Cursor) call into this journal to place trades and read
// account state WITHOUT the interactive OAuth browser flow.
//
// Authenticate with:  Authorization: Bearer <HYBRID_JOURNAL_MCP_TOKEN>
// Endpoint URL:        https://hybridjournal.base44.app/functions/hybridMcp
//
// Routes trades to:
//   - Kraken (paper/live) via the Hybrid Execution gateway (HYBRID_EXECUTION_URL + HYBRID_EXECUTION_API_KEY)
//   - cTrader via the user's connected cTrader Remote MCP account (BrokerConnection.mcp_url)
//
// Protocol: JSON-RPC 2.0 over HTTP (MCP 2024-11-05).
//   POST initialize / notifications/initialized / tools/list / tools/call

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { callCTraderMcp } from '../../shared/ctraderMcpClient.ts';

const MCP_TOKEN = Deno.env.get('HYBRID_JOURNAL_MCP_TOKEN');
const GATEWAY_URL = (Deno.env.get('HYBRID_EXECUTION_URL') || 'https://hybridzone-api.onrender.com').replace(/\/$/, '');
const GATEWAY_KEY = Deno.env.get('HYBRID_EXECUTION_API_KEY') || Deno.env.get('THZ_API_KEY') || '';
const PROTOCOL_VERSION = '2024-11-05';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, Mcp-Session-Id',
};

function ok(id, result) {
  return Response.json({ jsonrpc: '2.0', id, result }, {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
function rpcError(id, code, message) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message } }, {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

async function gateway(path, method = 'GET', body) {
  if (!GATEWAY_KEY) throw new Error('HYBRID_EXECUTION_API_KEY not configured on Hybrid Journal');
  const r = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': GATEWAY_KEY },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(data?.error || (Array.isArray(data?.errors) ? data.errors.join('; ') : `Gateway HTTP ${r.status}`));
  }
  return data;
}

async function ctraderTool(req, connectionId, tool, args) {
  const base44 = createClientFromRequest(req);
  const conns = await base44.asServiceRole.entities.BrokerConnection.filter({ id: connectionId });
  const conn = conns?.[0];
  if (!conn) throw new Error('cTrader connection not found for that connection_id');
  const isCTrader = conn.broker_id === 'ctrader' || conn.provider === 'cTrader';
  if (!isCTrader) throw new Error('That connection is not a cTrader connection');
  const mcpUrl = conn.mcp_url || conn.settings_json?.mcp_url;
  const mcpToken = conn.mcp_token || conn.settings_json?.mcp_token || conn.secret_ref || null;
  if (!mcpUrl) throw new Error('No MCP URL configured on that cTrader connection');
  const result = await callCTraderMcp(mcpUrl, mcpToken, 'tools/call', { name: tool, arguments: args || {} });
  return result?.result ?? result;
}

const TOOLS = [
  {
    name: 'place_trade',
    description:
      'Place a trade on the journal owner\'s account. Supports Kraken (paper/live via the Hybrid Execution gateway) and cTrader (via a connected cTrader Remote MCP account). For Kraken, mode="paper" executes immediately; mode="live" requires confirmation="CONFIRM_LIVE_TRADE". Set preview=true to parse and preview the intent without sending.',
    inputSchema: {
      type: 'object',
      properties: {
        broker: { type: 'string', description: 'kraken or ctrader. Defaults to kraken.' },
        mode: { type: 'string', description: 'paper or live (Kraken only). Defaults to paper.' },
        symbol: { type: 'string', description: 'Trading symbol, e.g. XBTUSD, ETHUSD, EURUSD.' },
        side: { type: 'string', description: 'BUY or SELL.' },
        volume: { type: 'number', description: 'Position size / volume.' },
        stop_loss: { type: 'number', description: 'Stop loss price (optional).' },
        take_profit: { type: 'number', description: 'Take profit price (optional).' },
        text: { type: 'string', description: 'Natural-language order. For Kraken, parsed by the gateway if symbol/side/volume are omitted.' },
        connection_id: { type: 'string', description: 'cTrader BrokerConnection id (required when broker=ctrader).' },
        preview: { type: 'boolean', description: 'If true, parse/preview without executing.' },
        confirmation: { type: 'string', description: 'Set to "CONFIRM_LIVE_TRADE" for live Kraken execution.' },
      },
    },
  },
  {
    name: 'get_positions',
    description: 'Get open positions. Kraken: pass broker="kraken" and mode. cTrader: pass broker="ctrader" and connection_id.',
    inputSchema: {
      type: 'object',
      properties: {
        broker: { type: 'string', description: 'kraken or ctrader. Defaults to kraken.' },
        mode: { type: 'string', description: 'paper or live (Kraken). Defaults to paper.' },
        connection_id: { type: 'string', description: 'cTrader BrokerConnection id (for broker=ctrader).' },
      },
    },
  },
  {
    name: 'get_account_status',
    description: 'Get account/balance and gateway status. Kraken: broker="kraken" returns gateway status + capabilities. cTrader: broker="ctrader" + connection_id returns the account balance.',
    inputSchema: {
      type: 'object',
      properties: {
        broker: { type: 'string', description: 'kraken or ctrader. Defaults to kraken.' },
        connection_id: { type: 'string', description: 'cTrader BrokerConnection id (for broker=ctrader).' },
      },
    },
  },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  // --- Bearer token auth ---
  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!MCP_TOKEN) {
    return Response.json({ error: 'HYBRID_JOURNAL_MCP_TOKEN not configured on Hybrid Journal' }, { status: 500, headers: CORS });
  }
  if (token !== MCP_TOKEN) {
    return Response.json({ error: 'Unauthorized: invalid MCP token' }, { status: 401, headers: CORS });
  }

  if (req.method === 'GET') {
    // MCP streamable HTTP allows GET for server-pushed streams; we push none.
    return new Response(null, { status: 405, headers: CORS });
  }
  if (req.method !== 'POST') return new Response(null, { status: 405, headers: CORS });

  const body = await req.json().catch(() => ({}));
  const { id, method, params = {} } = body;

  if (method === 'initialize') {
    return Response.json(
      {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: 'Hybrid Journal MCP', version: '1.0' },
        },
      },
      { headers: { 'Content-Type': 'application/json', 'mcp-session-id': 'hybrid-journal', ...CORS } }
    );
  }
  if (method === 'notifications/initialized') return new Response(null, { status: 204, headers: CORS });
  if (method === 'tools/list') return ok(id, { tools: TOOLS });
  if (method === 'tools/call') return await dispatchCall(id, params, req);

  return rpcError(id, -32601, `Method not found: ${method}`);
});

async function dispatchCall(id, params, req) {
  const name = params?.name;
  const args = params?.arguments || {};
  try {
    let result;
    switch (name) {
      case 'place_trade':
        result = await placeTrade(args, req);
        break;
      case 'get_positions':
        result = await getPositions(args, req);
        break;
      case 'get_account_status':
        result = await getAccountStatus(args, req);
        break;
      default:
        return rpcError(id, -32601, `Unknown tool: ${name}`);
    }
    return ok(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
  } catch (e) {
    return ok(id, { content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true });
  }
}

async function placeTrade(args, req) {
  const broker = String(args.broker || 'kraken').toLowerCase();

  if (broker === 'kraken') {
    const mode = String(args.mode || 'paper').toLowerCase();
    let intent;
    if (args.text && (!args.symbol || !args.side || args.volume == null)) {
      const parsed = await gateway('/api/execution/parse', 'POST', {
        text: args.text,
        broker: 'kraken',
        mode,
        source: 'hybrid-journal-mcp',
        symbol: args.symbol,
      });
      intent = parsed?.intent || parsed;
    } else {
      intent = {
        symbol: args.symbol,
        side: String(args.side || '').toUpperCase(),
        volume: Number(args.volume),
        ...(args.stop_loss != null ? { stop_loss: Number(args.stop_loss) } : {}),
        ...(args.take_profit != null ? { take_profit: Number(args.take_profit) } : {}),
      };
    }
    if (!intent?.symbol || !intent?.side || intent?.volume == null) {
      return { error: 'Could not resolve a complete order. Provide symbol, side, volume (or a descriptive text).', intent };
    }
    if (args.preview) {
      return gateway('/api/execution/intents/preview', 'POST', { ...intent, source: 'hybrid-journal-mcp' });
    }
    if (mode === 'live' && args.confirmation !== 'CONFIRM_LIVE_TRADE') {
      return { error: 'Live execution requires confirmation="CONFIRM_LIVE_TRADE"', preview: true, intent };
    }
    return gateway('/api/execution/intents/execute', 'POST', {
      ...intent,
      source: 'hybrid-journal-mcp',
      mode,
      confirmation: mode === 'live' ? 'CONFIRM_LIVE_TRADE' : 'preview',
    });
  }

  if (broker === 'ctrader') {
    if (!args.connection_id) throw new Error('connection_id is required for broker=ctrader');
    const order = {
      symbol: String(args.symbol).toUpperCase(),
      side: String(args.side).toUpperCase(),
      volume: Number(args.volume),
      ...(args.stop_loss != null ? { stop_loss: Number(args.stop_loss) } : {}),
      ...(args.take_profit != null ? { take_profit: Number(args.take_profit) } : {}),
    };
    if (!order.symbol || !order.side || order.volume == null) {
      throw new Error('symbol, side and volume are required for cTrader orders');
    }
    if (args.preview) return { dry_run: true, connection_id: args.connection_id, order };
    const result = await ctraderTool(req, args.connection_id, 'create_order', order);
    return { success: true, executed: true, connection_id: args.connection_id, order, broker_result: result };
  }

  throw new Error(`Unsupported broker: ${broker}`);
}

async function getPositions(args, req) {
  const broker = String(args.broker || 'kraken').toLowerCase();
  if (broker === 'kraken') {
    const mode = encodeURIComponent(String(args.mode || 'paper').toLowerCase());
    return gateway(`/api/execution/positions?broker=kraken&mode=${mode}`);
  }
  if (broker === 'ctrader') {
    if (!args.connection_id) throw new Error('connection_id is required for broker=ctrader');
    return ctraderTool(req, args.connection_id, 'get_positions', {});
  }
  throw new Error(`Unsupported broker: ${broker}`);
}

async function getAccountStatus(args, req) {
  const broker = String(args.broker || 'kraken').toLowerCase();
  if (broker === 'kraken') {
    const status = await gateway('/api/execution/status');
    const capabilities = await gateway('/api/execution/capabilities').catch(() => ({}));
    return { broker: 'kraken', gateway_url: GATEWAY_URL, status, capabilities };
  }
  if (broker === 'ctrader') {
    if (!args.connection_id) throw new Error('connection_id is required for broker=ctrader');
    const balance = await ctraderTool(req, args.connection_id, 'get_balance', {});
    return { broker: 'ctrader', connection_id: args.connection_id, balance };
  }
  throw new Error(`Unsupported broker: ${broker}`);
}