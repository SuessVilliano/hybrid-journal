const normalize = (value) => String(value || '').trim().toLowerCase();

const BROKER_SOURCES = [
  'dxtrade', 'ctrader', 'matchtrader', 'rithmic', 'mt4', 'mt5', 'tradovate',
  'tradelocker', 'ninjatrader', 'thinkorswim', 'binance', 'kraken', 'crosstrade'
];

const SIGNAL_MARKERS = ['signal', 'hybrid ai', 'hybrid_ai', 'strategy signal', 'alert'];
const SIM_MARKERS = ['paper', 'demo', 'sim', 'simulation', 'backtest', 'theoretical'];
const COPY_MARKERS = ['copy', 'copied', 'mirror'];

function containsAny(value, markers) {
  const text = normalize(value);
  return markers.some((marker) => text.includes(marker));
}

export function classifyTradeProvenance(trade = {}) {
  const source = normalize(trade.source);
  const platform = normalize(trade.platform);
  const importSource = normalize(trade.import_source);
  const combined = [source, platform, importSource, normalize(trade.notes), normalize(trade.tags?.join?.(' '))].join(' ');

  const hasBrokerIdentity = Boolean(
    trade.broker_trade_id ||
    trade.source_trade_id ||
    trade.broker_connection_id ||
    trade.connection_id ||
    trade.external_account_id
  );

  const brokerNamed = BROKER_SOURCES.some((broker) => combined.includes(broker));
  const apiImported = importSource.includes('api') || importSource.includes('webhook') || Boolean(trade.raw_payload);

  if (containsAny(combined, SIGNAL_MARKERS)) {
    return {
      category: 'signal',
      verification: 'unverified',
      label: 'Strategy Signal',
      confidence: 20,
      isVerifiedExecution: false,
      isExecution: false,
    };
  }

  if (containsAny(combined, SIM_MARKERS)) {
    return {
      category: 'simulated',
      verification: 'simulated',
      label: 'Simulated / Paper',
      confidence: 35,
      isVerifiedExecution: false,
      isExecution: true,
    };
  }

  if (containsAny(combined, COPY_MARKERS)) {
    const verified = hasBrokerIdentity || apiImported;
    return {
      category: 'copied_execution',
      verification: verified ? 'verified' : 'reported',
      label: verified ? 'Verified Copied Execution' : 'Copied Trade',
      confidence: verified ? 90 : 55,
      isVerifiedExecution: verified,
      isExecution: true,
    };
  }

  if ((brokerNamed && hasBrokerIdentity) || apiImported) {
    return {
      category: 'broker_execution',
      verification: 'verified',
      label: 'Verified Broker Execution',
      confidence: 100,
      isVerifiedExecution: true,
      isExecution: true,
    };
  }

  if (importSource.includes('csv') || importSource.includes('file')) {
    return {
      category: 'imported_execution',
      verification: 'reported',
      label: 'Imported Execution',
      confidence: 70,
      isVerifiedExecution: false,
      isExecution: true,
    };
  }

  if (source.includes('manual') || importSource.includes('manual') || (!source && !platform && !importSource)) {
    return {
      category: 'manual',
      verification: 'self_reported',
      label: 'Manual Entry',
      confidence: 45,
      isVerifiedExecution: false,
      isExecution: true,
    };
  }

  return {
    category: 'reported_execution',
    verification: hasBrokerIdentity ? 'verified' : 'reported',
    label: hasBrokerIdentity ? 'Verified Execution' : 'Reported Execution',
    confidence: hasBrokerIdentity ? 90 : 60,
    isVerifiedExecution: hasBrokerIdentity,
    isExecution: true,
  };
}

export function summarizeTradeProvenance(trades = []) {
  const summary = {
    total: 0,
    verifiedExecutions: 0,
    reportedExecutions: 0,
    manualEntries: 0,
    simulated: 0,
    signals: 0,
    weightedConfidence: 0,
    verificationRate: 0,
    dataConfidence: 0,
  };

  trades.forEach((trade) => {
    const provenance = classifyTradeProvenance(trade);
    summary.total += 1;
    summary.weightedConfidence += provenance.confidence;

    if (provenance.isVerifiedExecution) summary.verifiedExecutions += 1;
    else if (provenance.category === 'manual') summary.manualEntries += 1;
    else if (provenance.category === 'simulated') summary.simulated += 1;
    else if (provenance.category === 'signal') summary.signals += 1;
    else if (provenance.isExecution) summary.reportedExecutions += 1;
  });

  if (summary.total > 0) {
    summary.verificationRate = (summary.verifiedExecutions / summary.total) * 100;
    summary.dataConfidence = summary.weightedConfidence / summary.total;
  }

  return summary;
}

export function filterTradesByTrust(trades = [], mode = 'all') {
  if (mode === 'all') return trades;

  return trades.filter((trade) => {
    const provenance = classifyTradeProvenance(trade);
    if (mode === 'verified') return provenance.isVerifiedExecution;
    if (mode === 'executions') return provenance.isExecution && provenance.category !== 'simulated';
    if (mode === 'simulated') return provenance.category === 'simulated';
    if (mode === 'signals') return provenance.category === 'signal';
    return true;
  });
}
