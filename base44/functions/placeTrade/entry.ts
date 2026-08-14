import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { callCTraderMcp } from '../../shared/ctraderMcpClient.ts';

/**
 * Trade from text — parse a natural-language (or structured) order and send it
 * to the user's connected cTrader account via cTrader's Remote MCP server.
 *
 * Supports:
 *  - structured fields (symbol, side, volume, stop_loss, take_profit, order_type)
 *  - free text (e.g. "buy 0.1 EURUSD with SL 1.1050 and TP 1.1300") parsed via LLM
 *  - dry_run=true to preview the parsed order without sending
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let {
      text,
      symbol,
      side,
      volume,
      stop_loss,
      take_profit,
      order_type = 'MARKET',
      connection_id,
      dry_run = false,
    } = await req.json().catch(() => ({}));

    // Parse natural-language order text if structured fields are missing
    if (text && (!symbol || !side || !volume)) {
      const parsed = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract a trading order from this user request and return JSON. Request: "${text}"`,
        response_json_schema: {
          type: 'object',
          properties: {
            symbol: { type: 'string', description: 'Trading symbol e.g. EURUSD, XAUUSD, BTCUSD' },
            side: { type: 'string', enum: ['BUY', 'SELL'] },
            volume: { type: 'number', description: 'Position size in lots' },
            stop_loss: { type: 'number', description: 'Stop loss price, or omit if none' },
            take_profit: { type: 'number', description: 'Take profit price, or omit if none' },
            order_type: { type: 'string', enum: ['MARKET', 'LIMIT', 'STOP'] },
          },
          required: ['symbol', 'side', 'volume'],
        },
      });
      const p = parsed?.response || parsed?.data || parsed || {};
      symbol = symbol || p.symbol;
      side = side || p.side;
      volume = volume ?? p.volume;
      stop_loss = stop_loss ?? p.stop_loss;
      take_profit = take_profit ?? p.take_profit;
      order_type = order_type || p.order_type || 'MARKET';
    }

    if (!symbol || !side || !volume) {
      return Response.json(
        { error: 'Missing symbol, side, or volume. Provide structured fields or a descriptive text.' },
        { status: 400 }
      );
    }

    // Resolve the user's cTrader connection
    let conn;
    if (connection_id) {
      const conns = await base44.entities.BrokerConnection.filter({
        id: connection_id,
        created_by: user.email,
      });
      if (!conns.length) return Response.json({ error: 'Connection not found' }, { status: 404 });
      conn = conns[0];
    } else {
      const conns = await base44.entities.BrokerConnection.filter({
        broker_id: 'ctrader',
        created_by: user.email,
      });
      const ctraderConn = conns.find((c) => c.mcp_url || c.settings_json?.mcp_url) || conns[0];
      if (!ctraderConn) {
        return Response.json(
          { error: 'No connected cTrader account. Connect cTrader in Broker Sync and add its MCP URL.' },
          { status: 400 }
        );
      }
      conn = ctraderConn;
      connection_id = conn.id;
    }
    const isCTrader = conn.broker_id === 'ctrader' || conn.provider === 'cTrader';
    if (!isCTrader) {
      return Response.json({ error: 'Trade-from-text routes to cTrader connections only' }, { status: 400 });
    }

    const mcpUrl = conn.mcp_url || conn.settings_json?.mcp_url;
    const mcpToken = conn.mcp_token || conn.settings_json?.mcp_token || conn.secret_ref || conn.api_secret || null;
    if (!mcpUrl) {
      return Response.json(
        { error: 'No cTrader MCP URL on this connection. Add it in Broker Sync.' },
        { status: 400 }
      );
    }

    const order = {
      symbol: String(symbol).toUpperCase(),
      side: String(side).toUpperCase(),
      volume: Number(volume),
      order_type: String(order_type || 'MARKET').toUpperCase(),
      ...(stop_loss != null && stop_loss !== '' ? { stop_loss: Number(stop_loss) } : {}),
      ...(take_profit != null && take_profit !== '' ? { take_profit: Number(take_profit) } : {}),
    };

    if (dry_run) {
      return Response.json({
        success: true,
        dry_run: true,
        connection_id,
        order,
        note: 'No order sent. Set dry_run=false to execute.',
      });
    }

    const result = await callCTraderMcp(mcpUrl, mcpToken, 'tools/call', {
      name: 'create_order',
      arguments: order,
    });
    if (result?.error) {
      return Response.json({ error: 'cTrader rejected order', detail: result.error }, { status: 502 });
    }

    return Response.json({
      success: true,
      executed: true,
      connection_id,
      order,
      broker_result: result?.result ?? result,
    });
  } catch (error) {
    console.error('[placeTrade] error:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});