import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ALLOWED_HOSTS = [
  'hybridfundingdashboard.propaccount.com',
  'propaccount.com',
  'www.myfxbook.com',
  'myfxbook.com',
  'www.fxblue.com',
  'fxblue.com'
];

const METRIC_ALIASES: Record<string, string[]> = {
  balance: ['balance', 'accountbalance', 'currentbalance'],
  equity: ['equity', 'accountequity', 'currentequity'],
  pnl: ['pnl', 'profit', 'netprofit', 'totalprofit', 'profitloss'],
  drawdown: ['drawdown', 'maxdrawdown', 'dd'],
  win_rate: ['winrate', 'winningpercentage', 'winpercentage'],
  trades: ['trades', 'totaltrades', 'tradecount']
};

function normalizeUrl(input: string) {
  const raw = String(input || '').trim();
  if (!raw) throw new Error('Missing URL');
  return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
}

function hostAllowed(hostname: string) {
  const host = hostname.toLowerCase();
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function detectProvider(url: URL) {
  const host = url.hostname.toLowerCase();
  if (host.includes('propaccount.com')) {
    const match = url.pathname.match(/\/public-overview\/([^/?#]+)/i);
    return { provider: 'propaccount', accountId: match?.[1] || '' };
  }
  if (host.includes('myfxbook.com')) return { provider: 'myfxbook', accountId: url.pathname.split('/').filter(Boolean).pop() || '' };
  if (host.includes('fxblue.com')) return { provider: 'fxblue', accountId: url.pathname.split('/').filter(Boolean).pop() || '' };
  return { provider: 'other', accountId: '' };
}

function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/[$,%\s,]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function keyNorm(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function walk(value: unknown, visitor: (key: string, value: unknown) => void, depth = 0) {
  if (depth > 8 || value == null) return;
  if (Array.isArray(value)) {
    value.slice(0, 5000).forEach((item) => walk(item, visitor, depth + 1));
    return;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      visitor(key, child);
      walk(child, visitor, depth + 1);
    }
  }
}

function extractMetrics(objects: unknown[]) {
  const found: Record<string, number> = {};
  for (const obj of objects) {
    walk(obj, (key, value) => {
      const normalized = keyNorm(key);
      for (const [metric, aliases] of Object.entries(METRIC_ALIASES)) {
        if (found[metric] !== undefined || !aliases.includes(normalized)) continue;
        const n = safeNumber(value);
        if (n !== null) found[metric] = n;
      }
    });
  }
  return found;
}

function looksLikeTrade(row: any) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
  const keys = Object.keys(row).map(keyNorm);
  const hasSymbol = keys.some((k) => ['symbol', 'instrument', 'ticker', 'asset'].includes(k));
  const hasPnl = keys.some((k) => ['pnl', 'profit', 'realizedpnl', 'netprofit'].includes(k));
  const hasTime = keys.some((k) => ['opentime', 'entrytime', 'entrydate', 'closetime', 'exittime', 'closedat'].includes(k));
  return hasSymbol && (hasPnl || hasTime);
}

function findTradeRows(objects: unknown[]) {
  const rows: any[] = [];
  const seen = new Set<any>();
  for (const obj of objects) {
    walk(obj, (_key, value) => {
      if (!Array.isArray(value) || value.length === 0) return;
      const candidates = value.filter(looksLikeTrade);
      if (candidates.length >= Math.min(1, value.length)) {
        for (const row of candidates.slice(0, 5000)) {
          if (!seen.has(row)) {
            seen.add(row);
            rows.push(row);
          }
        }
      }
    });
  }
  return rows;
}

function pick(row: any, aliases: string[]) {
  for (const [key, value] of Object.entries(row || {})) {
    if (aliases.includes(keyNorm(key))) return value;
  }
  return undefined;
}

function normalizeTrade(row: any, sourceUrl: string, provider: string, sourceId: string) {
  const pnlValue = pick(row, ['pnl', 'profit', 'realizedpnl', 'netprofit']);
  const pnl = safeNumber(pnlValue);
  if (pnl === null) return null;

  const rawSide = String(pick(row, ['side', 'direction', 'type', 'orderside']) || '').toLowerCase();
  const side = rawSide.includes('buy') || rawSide.includes('long') ? 'Long' : rawSide.includes('sell') || rawSide.includes('short') ? 'Short' : 'Long';
  const symbol = String(pick(row, ['symbol', 'instrument', 'ticker', 'asset']) || '').trim();
  const entryDate = pick(row, ['entrydate', 'entrytime', 'opentime', 'openedat', 'createdat']);
  if (!symbol || !entryDate) return null;

  const providerTradeId = String(pick(row, ['id', 'tradeid', 'positionid', 'ticket', 'orderid']) || '');
  const fallbackId = `${provider}:${sourceId}:${symbol}:${String(entryDate)}:${pnl}`;

  return {
    symbol,
    side,
    entry_date: String(entryDate),
    exit_date: pick(row, ['exitdate', 'exittime', 'closetime', 'closedat']) || null,
    entry_price: safeNumber(pick(row, ['entryprice', 'openprice', 'priceopen'])) || null,
    exit_price: safeNumber(pick(row, ['exitprice', 'closeprice', 'priceclose'])) || null,
    quantity: safeNumber(pick(row, ['quantity', 'size', 'volume', 'lots'])) || null,
    pnl,
    pnl_net: safeNumber(pick(row, ['netpnl', 'netprofit'])) ?? pnl,
    commission: safeNumber(pick(row, ['commission', 'fees', 'fee'])) || 0,
    swap: safeNumber(pick(row, ['swap', 'financing'])) || 0,
    source: `Public Performance URL (${provider})`,
    source_trade_id: providerTradeId || fallbackId,
    broker_trade_id: providerTradeId || fallbackId,
    import_source: 'Public Performance URL Sync',
    platform: 'Other',
    trade_status: pick(row, ['status']) ? String(pick(row, ['status'])).toLowerCase() : 'closed',
    raw_payload: { provider, source_url: sourceUrl, row }
  };
}

function parseEmbeddedJson(html: string) {
  const objects: unknown[] = [];
  const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRegex.exec(html))) {
    const text = match[1]?.trim();
    if (!text || text.length > 5_000_000) continue;
    if (text.startsWith('{') || text.startsWith('[')) {
      try { objects.push(JSON.parse(text)); } catch {}
    }
    const assignment = text.match(/(?:__NEXT_DATA__|__INITIAL_STATE__|__APOLLO_STATE__)\s*=\s*({[\s\S]*}|\[[\s\S]*\])\s*;?$/);
    if (assignment) {
      try { objects.push(JSON.parse(assignment[1])); } catch {}
    }
  }
  return objects;
}

function discoverSameOriginJsonUrls(html: string, base: URL) {
  const urls = new Set<string>();
  const regex = /(?:https?:\/\/[^"'\s<>]+|\/(?:api|_next\/data)[^"'\s<>]+)/gi;
  for (const match of html.match(regex) || []) {
    try {
      const u = new URL(match.replace(/&amp;/g, '&'), base.origin);
      if (u.origin !== base.origin) continue;
      if (!/(api|json|public|overview|dashboard|stats|trade|account|performance)/i.test(u.pathname + u.search)) continue;
      urls.add(u.toString());
    } catch {}
    if (urls.size >= 8) break;
  }
  return [...urls];
}

async function fetchJsonCandidates(urls: string[]) {
  const objects: unknown[] = [];
  const attempted: string[] = [];
  for (const url of urls.slice(0, 8)) {
    attempted.push(url);
    try {
      const res = await fetch(url, { headers: { 'Accept': 'application/json,text/plain,*/*', 'User-Agent': 'HybridJournal-PublicPerformance/1.0' } });
      const type = res.headers.get('content-type') || '';
      if (!res.ok || !type.includes('json')) continue;
      objects.push(await res.json());
    } catch {}
  }
  return { objects, attempted };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const sourceId = body.source_id ? String(body.source_id) : '';
    let source: any = null;
    let inputUrl = body.url ? String(body.url) : '';

    if (sourceId) {
      const rows = await base44.entities.PublicPerformanceSource.filter({ id: sourceId });
      source = rows[0];
      if (!source || source.created_by !== user.email) return Response.json({ error: 'Source not found' }, { status: 404 });
      inputUrl = source.url;
    }

    const target = normalizeUrl(inputUrl);
    if (target.protocol !== 'https:') throw new Error('Only HTTPS public performance URLs are supported');
    if (!hostAllowed(target.hostname)) throw new Error(`Unsupported public performance host: ${target.hostname}`);

    const detected = detectProvider(target);
    const response = await fetch(target.toString(), {
      redirect: 'follow',
      headers: { 'Accept': 'text/html,application/xhtml+xml,application/json', 'User-Agent': 'HybridJournal-PublicPerformance/1.0' }
    });
    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();
    if (!response.ok) throw new Error(`Public page returned HTTP ${response.status}`);

    const objects: unknown[] = [];
    if (contentType.includes('json')) {
      try { objects.push(JSON.parse(text)); } catch {}
    } else {
      objects.push(...parseEmbeddedJson(text));
    }

    const candidateUrls = contentType.includes('html') ? discoverSameOriginJsonUrls(text, target) : [];
    const candidateData = await fetchJsonCandidates(candidateUrls);
    objects.push(...candidateData.objects);

    const metrics = extractMetrics(objects);
    const rows = findTradeRows(objects);
    const normalizedTrades = rows
      .map((row) => normalizeTrade(row, target.toString(), detected.provider, detected.accountId))
      .filter(Boolean);

    let currentSource = source;
    const now = new Date().toISOString();
    const trustLevel = candidateData.objects.length > 0 || objects.length > 0 ? 'structured_public_feed' : 'public_report';
    const snapshot = {
      ...metrics,
      structured_objects_found: objects.length,
      trade_rows_found: normalizedTrades.length,
      candidate_endpoints_found: candidateUrls.length,
      synced_at: now
    };

    const sourcePayload = {
      url: target.toString(),
      provider: detected.provider,
      provider_account_id: detected.accountId,
      display_name: source?.display_name || (detected.provider === 'propaccount' ? 'Hybrid Funding Public Dashboard' : `${detected.provider} public performance`),
      status: normalizedTrades.length > 0 || Object.keys(metrics).length > 0 ? 'connected' : 'partial',
      trust_level: trustLevel,
      last_sync: now,
      last_http_status: response.status,
      last_snapshot: snapshot,
      last_error: '',
      metadata: {
        hostname: target.hostname,
        pathname: target.pathname,
        content_type: contentType,
        discovered_endpoints: candidateUrls,
        attempted_endpoints: candidateData.attempted
      }
    };

    if (currentSource) {
      currentSource = await base44.entities.PublicPerformanceSource.update(currentSource.id, sourcePayload);
    } else {
      currentSource = await base44.entities.PublicPerformanceSource.create(sourcePayload);
    }

    const existingTrades = await base44.entities.Trade.filter({ source: `Public Performance URL (${detected.provider})` }, '-entry_date', 5000);
    const existingIds = new Set(existingTrades.map((t: any) => t.source_trade_id).filter(Boolean));
    let imported = 0;
    let skipped = 0;

    for (const trade of normalizedTrades) {
      if (existingIds.has((trade as any).source_trade_id)) {
        skipped++;
        continue;
      }
      await base44.entities.Trade.create(trade);
      existingIds.add((trade as any).source_trade_id);
      imported++;
    }

    return Response.json({
      success: true,
      source: currentSource,
      provider: detected.provider,
      provider_account_id: detected.accountId,
      trust_level: trustLevel,
      snapshot,
      imported,
      skipped,
      discovered_endpoints: candidateUrls.length
    });
  } catch (error) {
    return Response.json({ success: false, error: error?.message || String(error) }, { status: 400 });
  }
});
