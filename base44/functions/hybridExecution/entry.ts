import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const GATEWAY_URL = (Deno.env.get('HYBRID_EXECUTION_URL') || 'https://hybridzone-api.onrender.com').replace(/\/$/, '');
const GATEWAY_KEY = Deno.env.get('HYBRID_EXECUTION_API_KEY') || Deno.env.get('THZ_API_KEY') || '';
const ACTIONS = new Set(['status','capabilities','parse','preview','paper_execute','live_execute','positions','orders','account_snapshot','history','option_expirations','option_chain']);

async function gateway(path: string, method = 'GET', body?: unknown) {
  if (!GATEWAY_KEY) throw new Error('HYBRID_EXECUTION_API_KEY or THZ_API_KEY secret is not configured');
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': GATEWAY_KEY },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || (Array.isArray(data?.errors) ? data.errors.join('; ') : `Gateway HTTP ${response.status}`));
  return data;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const action = String(body.action || 'status');
    if (!ACTIONS.has(action)) return Response.json({ error: `Unsupported action: ${action}` }, { status: 400 });
    const source = `hybrid-journal:${user.id || user.email || 'user'}`;

    if (action === 'status') return Response.json(await gateway('/api/execution/status'));
    if (action === 'capabilities') return Response.json(await gateway('/api/execution/capabilities'));
    if (action === 'parse') {
      const broker = String(body.broker || 'kraken').toLowerCase();
      const mode = body.mode || (broker === 'public' ? 'live' : 'paper');
      return Response.json(await gateway('/api/execution/parse', 'POST', { text: body.text, broker, mode, source, symbol: body.symbol, instrumentType: body.instrumentType, openCloseIndicator: body.openCloseIndicator }));
    }
    if (action === 'preview') return Response.json(await gateway('/api/execution/intents/preview', 'POST', { ...(body.intent || {}), source }));
    if (action === 'paper_execute') return Response.json(await gateway('/api/execution/intents/execute', 'POST', { ...(body.intent || {}), source, mode: 'paper', confirmation: 'preview' }));
    if (action === 'live_execute') {
      if (body.confirmation !== 'CONFIRM_LIVE_TRADE') return Response.json({ error: 'Explicit live confirmation required' }, { status: 409 });
      return Response.json(await gateway('/api/execution/intents/execute', 'POST', { ...(body.intent || {}), source, mode: 'live', confirmation: 'CONFIRM_LIVE_TRADE' }));
    }
    const brokerRaw = String(body.broker || 'kraken').toLowerCase();
    const broker = encodeURIComponent(brokerRaw);
    const modeRaw = String(body.mode || (brokerRaw === 'public' ? 'live' : 'paper')).toLowerCase();
    const mode = encodeURIComponent(modeRaw);
    const account = body.accountId ? `&accountId=${encodeURIComponent(String(body.accountId))}` : '';
    if (action === 'positions') return Response.json(await gateway(`/api/execution/positions?broker=${broker}&mode=${mode}${account}`));
    if (action === 'orders') return Response.json(await gateway(`/api/execution/orders?broker=${broker}&mode=${mode}${account}`));
    if (action === 'account_snapshot') return Response.json(await gateway(`/api/execution/account-snapshot?broker=${broker}&mode=${mode}${account}`));
    if (action === 'history') {
      const qs = new URLSearchParams({ broker: brokerRaw });
      if (body.accountId) qs.set('accountId', String(body.accountId));
      if (body.start) qs.set('start', String(body.start));
      if (body.end) qs.set('end', String(body.end));
      if (body.pageSize) qs.set('pageSize', String(body.pageSize));
      if (body.nextToken) qs.set('nextToken', String(body.nextToken));
      return Response.json(await gateway(`/api/execution/history?${qs.toString()}`));
    }
    if (action === 'option_expirations') {
      if (!body.symbol) return Response.json({ error: 'symbol is required' }, { status: 400 });
      const qs = new URLSearchParams({ broker: brokerRaw });
      if (body.accountId) qs.set('accountId', String(body.accountId));
      if (body.instrumentType) qs.set('instrumentType', String(body.instrumentType));
      return Response.json(await gateway(`/api/execution/options/${encodeURIComponent(String(body.symbol))}/expirations?${qs.toString()}`));
    }
    if (action === 'option_chain') {
      if (!body.symbol || !body.expirationDate) return Response.json({ error: 'symbol and expirationDate are required' }, { status: 400 });
      const qs = new URLSearchParams({ broker: brokerRaw, expirationDate: String(body.expirationDate) });
      if (body.accountId) qs.set('accountId', String(body.accountId));
      if (body.instrumentType) qs.set('instrumentType', String(body.instrumentType));
      return Response.json(await gateway(`/api/execution/options/${encodeURIComponent(String(body.symbol))}/chain?${qs.toString()}`));
    }
    return Response.json({ error: 'Unhandled action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
});
