# Hybrid Ecosystem Event Contract

Hybrid Zone is the control plane and broker boundary. ABATEV creates/inspects intents. HybridCopy fans approved intents out to follower accounts. Hybrid Journal stores immutable lifecycle evidence and broker-confirmed trades.

## Required lineage

Every execution lifecycle should preserve these identifiers when available:

- `signalId` — source strategy/alert identifier
- `intentId` — normalized trade intent identifier
- `executionId` — one execution attempt
- `masterExecutionId` — source execution for copied child trades
- `copyRelationshipId` — master/follower relationship
- `brokerOrderId` — broker-confirmed order identifier
- `brokerPositionId` — broker-confirmed position identifier

## Lifecycle

1. `signal.received`
2. `intent.normalized`
3. `intent.validated`
4. `execution.accepted`
5. `execution.broker_acknowledged`
6. `execution.partially_filled` or `execution.filled`
7. child copies use `copy.child_created` / `copy.child_acknowledged`
8. `journal.synced`
9. discrepancies use `reconciliation.mismatch`

Cancellation/rejection use `execution.cancelled` and `execution.rejected`.

## Fill truth rule

Hybrid Journal MUST NOT create a Trade from an alert, normalized intent, local app state, or `SENT` status.

A Trade may be created/updated from an `execution.filled` event only when:

- `brokerConfirmed === true`
- `brokerOrderId` is present
- fill quantity and fill price originate from broker/gateway state

Pre-fill events remain in `ExecutionEvent` for observability and audit.

## Example

```json
{
  "eventId": "exec_evt_01",
  "eventType": "execution.filled",
  "source": "HybridCopy",
  "signalId": "tv_123",
  "intentId": "hyb_abc",
  "executionId": "exec_child_01",
  "masterExecutionId": "exec_master_01",
  "copyRelationshipId": "copy_01",
  "connectionId": "conn_kraken_demo_2",
  "accountExternalId": "demo-subaccount-2",
  "venue": "KRAKEN_FUTURES",
  "environment": "DEMO",
  "canonicalSymbol": "NASDAQ100",
  "symbol": "PF_US100USD",
  "side": "BUY",
  "orderType": "market",
  "requestedQuantity": 1,
  "filledQuantity": 1,
  "fillPrice": 25000.5,
  "brokerOrderId": "BROKER_ORDER_ID",
  "brokerStatus": "filled",
  "brokerConfirmed": true,
  "occurredAt": "2026-09-14T16:30:00Z"
}
```

## Environment isolation

`PAPER`, `DEMO`, and `LIVE` are distinct. An event must retain its environment through ABATEV → Hybrid Zone → HybridCopy → Journal. UI surfaces must never relabel one environment as another.

## Canonical symbol routing

Strategies should emit canonical instruments. Venue adapters resolve them. Example:

- canonical `NASDAQ100`
- Kraken Futures: `PF_US100USD`
- Tradovate: `MNQ`
- cTrader / DXtrade: connection-specific alias

The canonical and venue symbols should both be journaled so reports can aggregate across brokers.
