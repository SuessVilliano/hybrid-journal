/**
 * Shared trading analytics metric helpers.
 *
 * Centralizes profit factor / win rate math so every surface (dashboard,
 * public dashboard, analytics components, widgets) reports the same numbers.
 */

/**
 * Profit factor = gross profit / gross loss.
 *
 * @param {number} grossProfit - Sum of winning trade P&L (>= 0).
 * @param {number} grossLoss - Absolute sum of losing trade P&L (>= 0).
 * @returns {number} Infinity when there are profits but no losses,
 *   0 when there is neither profit nor loss.
 */
export function profitFactor(grossProfit, grossLoss) {
  return grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0);
}

/**
 * Format a profit factor for display: "∞" for non-finite values
 * (no losing trades), otherwise fixed to 2 decimals.
 *
 * @param {number} pf
 * @returns {string}
 */
export function formatProfitFactor(pf) {
  return Number.isFinite(pf) ? pf.toFixed(2) : '∞';
}

/**
 * Win rate as a percentage (0-100).
 *
 * A trade counts as a win when pnl > 0. Break-even trades (pnl === 0)
 * are NOT wins but DO count in the denominator, so heavy break-even
 * activity lowers the reported win rate.
 *
 * @param {Array<{pnl?: number}>} trades
 * @returns {number} 0 when the list is empty/undefined.
 */
export function winRate(trades) {
  if (!trades || trades.length === 0) return 0;
  const wins = trades.filter(t => t.pnl > 0).length;
  return (wins / trades.length) * 100;
}

/**
 * Whether a trade is closed.
 *
 * Per the Trade schema (base44/entities/Trade.jsonc), trade_status is one of
 * "open" | "closed" | "partial" | "rejected" | "cancelled" with default
 * "closed". A trade is considered closed when it has an exit_date or its
 * trade_status is "closed" (including legacy trades with no status, which
 * default to closed only when they carry an exit_date).
 *
 * @param {{exit_date?: string, trade_status?: string}} trade
 * @returns {boolean}
 */
export function isClosed(trade) {
  if (!trade) return false;
  return Boolean(trade.exit_date) || trade.trade_status === 'closed';
}
