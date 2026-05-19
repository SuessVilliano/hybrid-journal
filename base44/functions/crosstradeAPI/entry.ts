import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CrossTrade integration gateway.
 *
 * Wraps the CrossTrade v1 REST API so the journal can connect headlessly with
 * a per-trader API key. The transport is abstracted behind `callCrossTrade()`
 * so CrossTrade's hosted MCP server (Elite tier) can be added later without
 * changing any caller — flip a connection's `transport` field to "mcp" once
 * the MCP branch is wired up.
 *
 * Actions:
 *   validate   { apiKey }                          -> test key, return accounts
 *   accounts   { connectionId }                    -> list accounts
 *   positions  { connectionId, account }           -> open positions / balances
 *   executions { connectionId, account }           -> fills / executions
 *   orders     { connectionId, account }           -> working / recent orders
 *   placeOrder { connectionId, account, order }    -> place an order (route out)
 *   flatten    { connectionId, account, instrument } -> flatten a position
 *
 * NOTE: REST endpoint paths and order payload field names follow CrossTrade's
 * documented v1 API conventions. If CrossTrade publishes different names,
 * adjust CONFIG / callCrossTrade / the order builder in routeTrade only.
 */

const CONFIG = {
  restBase: 'https://app.crosstrade.io/v1/api',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

async function restRequest(apiKey: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${CONFIG.restBase}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { ok: res.ok, status: res.status, data };
}

// Transport dispatch. REST is live today; "mcp" is reserved for CrossTrade's
// hosted MCP server and is intentionally not enabled yet.
async function callCrossTrade(connection: any, op: string, args: any = {}) {
  const transport = connection.transport || 'rest';

  if (transport === 'mcp') {
    throw new Error(
      'CrossTrade MCP transport is not enabled yet. Set the connection transport to "rest".',
    );
  }

  const apiKey = connection.api_key;
  if (!apiKey) throw new Error('CrossTrade connection has no API key');

  const acct = args.account ? encodeURIComponent(String(args.account)) : null;

  switch (op) {
    case 'accounts':
      return restRequest(apiKey, 'GET', '/accounts');
    case 'positions':
      return restRequest(apiKey, 'GET', `/accounts/${acct}/positions`);
    case 'executions':
      return restRequest(apiKey, 'GET', `/accounts/${acct}/executions`);
    case 'orders':
      return restRequest(apiKey, 'GET', `/accounts/${acct}/orders`);
    case 'placeOrder':
      return restRequest(apiKey, 'POST', `/accounts/${acct}/orders`, args.order);
    case 'flatten':
      return restRequest(apiKey, 'POST', `/accounts/${acct}/positions/flatten`, {
        instrument: args.instrument,
      });
    default:
      throw new Error(`Unknown CrossTrade op: ${op}`);
  }
}

// CrossTrade may return an account list as an array or wrapped in an object.
function extractAccounts(data: any) {
  const raw = Array.isArray(data) ? data : data?.accounts || data?.data || [];
  return (raw as any[])
    .map((a) => {
      if (typeof a === 'string') return { id: a, name: a };
      return {
        id: a.id || a.account || a.account_id || a.name,
        name: a.name || a.account || a.id || a.account_id,
        broker: a.broker || a.provider || null,
        connected: a.connected ?? a.is_connected ?? null,
      };
    })
    .filter((a) => a.id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const action = body.action;

    // validate runs against a raw API key before any connection is stored.
    if (action === 'validate') {
      if (!body.apiKey) {
        return Response.json(
          { valid: false, error: 'Missing apiKey' },
          { status: 400, headers: corsHeaders },
        );
      }

      const result = await callCrossTrade(
        { api_key: body.apiKey, transport: body.transport || 'rest' },
        'accounts',
      );

      if (!result.ok) {
        return Response.json(
          {
            valid: false,
            status: result.status,
            message:
              result.status === 401
                ? 'CrossTrade rejected the API key (401). Verify the key in your CrossTrade dashboard.'
                : `CrossTrade returned HTTP ${result.status}.`,
            detail: result.data,
          },
          { headers: corsHeaders },
        );
      }

      return Response.json(
        { valid: true, accounts: extractAccounts(result.data) },
        { headers: corsHeaders },
      );
    }

    // Every other action operates on a stored, user-owned connection.
    if (!body.connectionId) {
      return Response.json(
        { error: 'Missing connectionId' },
        { status: 400, headers: corsHeaders },
      );
    }

    const connections = await base44.entities.CrossTradeConnection.filter({
      id: body.connectionId,
      created_by: user.email,
    });

    if (connections.length === 0) {
      return Response.json(
        { error: 'CrossTrade connection not found' },
        { status: 404, headers: corsHeaders },
      );
    }

    const connection = connections[0];
    let result;

    switch (action) {
      case 'accounts':
        result = await callCrossTrade(connection, 'accounts');
        return Response.json(
          {
            ok: result.ok,
            status: result.status,
            accounts: result.ok ? extractAccounts(result.data) : [],
            detail: result.ok ? undefined : result.data,
          },
          { headers: corsHeaders },
        );
      case 'positions':
        result = await callCrossTrade(connection, 'positions', { account: body.account });
        break;
      case 'executions':
        result = await callCrossTrade(connection, 'executions', { account: body.account });
        break;
      case 'orders':
        result = await callCrossTrade(connection, 'orders', { account: body.account });
        break;
      case 'placeOrder':
        result = await callCrossTrade(connection, 'placeOrder', {
          account: body.account,
          order: body.order,
        });
        break;
      case 'flatten':
        result = await callCrossTrade(connection, 'flatten', {
          account: body.account,
          instrument: body.instrument,
        });
        break;
      default:
        return Response.json(
          { error: `Unknown action: ${action}` },
          { status: 400, headers: corsHeaders },
        );
    }

    return Response.json(
      { ok: result.ok, status: result.status, data: result.data },
      { status: result.ok ? 200 : 502, headers: corsHeaders },
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});
