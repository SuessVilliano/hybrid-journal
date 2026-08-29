// Shared Hybrid Execution primitives.
// Keep broker credentials out of browser code. This module creates intents,
// captures speech and calls a platform-provided server endpoint.

export const HYBRID_EXECUTION_VERSION = '2026-08-29'

export function createTradeIntent(input = {}) {
  return {
    version: HYBRID_EXECUTION_VERSION,
    intentId: input.intentId || crypto.randomUUID(),
    source: input.source || window.location.host,
    broker: String(input.broker || 'kraken').toLowerCase(),
    accountId: input.accountId || null,
    mode: String(input.mode || 'paper').toLowerCase(),
    symbol: String(input.symbol || input.pair || '').toUpperCase().replace('/', ''),
    side: String(input.side || '').toLowerCase(),
    orderType: String(input.orderType || input.type || 'market').toLowerCase(),
    quantity: Number(input.quantity ?? input.volume ?? 0),
    price: input.price == null ? null : Number(input.price),
    stopLoss: input.stopLoss == null ? null : Number(input.stopLoss),
    takeProfit: input.takeProfit == null ? null : Number(input.takeProfit),
    riskUsd: input.riskUsd == null ? null : Number(input.riskUsd),
    rationale: input.rationale || null,
    strategy: input.strategy || null,
    confirmation: input.confirmation || 'preview',
    metadata: input.metadata || {},
    createdAt: input.createdAt || new Date().toISOString(),
  }
}

export function validateTradeIntent(intent) {
  const errors = []
  if (!intent?.symbol) errors.push('Symbol is required')
  if (!['buy', 'sell'].includes(intent?.side)) errors.push('Side must be buy or sell')
  if (!['market', 'limit'].includes(intent?.orderType)) errors.push('Order type must be market or limit')
  if (!['paper', 'live'].includes(intent?.mode)) errors.push('Mode must be paper or live')
  if (!(Number(intent?.quantity) > 0)) errors.push('Quantity must be greater than zero')
  if (intent?.orderType === 'limit' && !(Number(intent?.price) > 0)) errors.push('Limit price is required')
  return { ok: errors.length === 0, errors }
}

export function tradeReadback(intent) {
  if (!intent) return ''
  const price = intent.orderType === 'limit' ? ` at ${intent.price}` : ' at market'
  const protection = [
    intent.stopLoss ? `stop ${intent.stopLoss}` : null,
    intent.takeProfit ? `target ${intent.takeProfit}` : null,
  ].filter(Boolean).join(', ')
  return `${intent.mode.toUpperCase()} ${intent.side.toUpperCase()} ${intent.quantity} ${intent.symbol}${price}${protection ? `, ${protection}` : ''} via ${intent.broker}.`
}

export class HybridExecutionClient {
  constructor({ baseUrl = '', getAccessToken = null } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.getAccessToken = getAccessToken
  }

  async request(path, { method = 'GET', body } = {}) {
    const token = this.getAccessToken ? await this.getAccessToken() : null
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body == null ? undefined : JSON.stringify(body),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || `Execution request failed (${response.status})`)
    return data
  }

  status() { return this.request('/api/execution/status') }
  capabilities() { return this.request('/api/execution/capabilities') }
  parse(text, context = {}) { return this.request('/api/execution/intents/parse', { method: 'POST', body: { text, context } }) }
  preview(intent) { return this.request('/api/execution/intents/preview', { method: 'POST', body: { intent: createTradeIntent(intent) } }) }
  execute(intent) { return this.request('/api/execution/intents/execute', { method: 'POST', body: { intent: createTradeIntent(intent) } }) }
  positions() { return this.request('/api/execution/positions') }
  orders() { return this.request('/api/execution/orders') }
}

export function speechRecognitionSupported() {
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function listenForTradeCommand({ language = 'en-US', interim = false } = {}) {
  return new Promise((resolve, reject) => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) return reject(new Error('Speech recognition is not supported in this browser'))
    const recognition = new Recognition()
    recognition.lang = language
    recognition.interimResults = interim
    recognition.maxAlternatives = 1
    recognition.onresult = event => resolve(event.results[event.results.length - 1][0].transcript.trim())
    recognition.onerror = event => reject(new Error(event.error || 'Speech recognition failed'))
    recognition.onnomatch = () => reject(new Error('No trade command was recognized'))
    recognition.start()
  })
}
