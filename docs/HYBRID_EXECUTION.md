# Hybrid Journal — Hybrid Execution Integration

Hybrid Journal is the canonical system of record for the shared Trade Hybrid execution layer.

## Rule

Hybrid Journal does not store Kraken API keys and does not talk directly to Kraken from browser code. It sends/receives normalized TradeIntents and execution events through the Hybrid Execution Gateway hosted by the Hybrid Zone backend.

Shared browser helpers: `src/lib/hybrid-execution.js`.

## Journal every stage

Store both successful and rejected decisions:

- intent.created
- intent.parsed
- risk.checked
- order.previewed
- order.approved/rejected
- order.submitted
- order.accepted/rejected
- order.filled/partially_filled
- position.updated
- trade.closed
- journal.recorded

Recommended fields include `intentId`, `source`, `broker`, `accountId`, `mode`, `symbol`, `side`, `orderType`, quantity/notional, stop, target, risk, broker order ID, fill IDs, fees, P&L, AI rationale, guardian/risk result, timestamps and the original text/voice transcript.

## Text-to-trade

Text is first parsed into a proposed TradeIntent, then previewed. The LLM never bypasses the deterministic risk layer.

Example command:

> Buy 0.001 BTC at market in paper mode, stop 65000, target 72000.

Expected intent uses `broker: kraken`, `mode: paper`, `symbol: BTCUSD`, `side: buy`.

## Talk-to-trade

Use `listenForTradeCommand()` from `src/lib/hybrid-execution.js`, send the transcript to the server parser, then show `tradeReadback(intent)` before approval. Live execution requires an explicit confirmation policy.

## Kraken MCP

Kraken's official MCP is run only on a controlled execution node. The web app consumes the Hybrid Execution Gateway, never the raw stdio MCP server. Default rollout is market/account/paper before guarded live trading.

## Product role

Hybrid Journal owns history, analytics, decision memory, screenshots/notes and post-trade review. Broker adapters remain outside the journal so adding Kraken futures, cTrader, Tradovate or another broker never requires rebuilding the journal model.
