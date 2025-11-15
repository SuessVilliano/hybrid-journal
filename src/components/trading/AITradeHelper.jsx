import { base44 } from '@/api/base44Client';

// Detect instrument type from symbol
export function detectInstrumentType(symbol) {
  const s = symbol.toUpperCase();
  
  // Forex pairs
  if (/^[A-Z]{6}$/.test(s) || s.includes('/') && s.length <= 7) {
    return 'Forex';
  }
  
  // Crypto
  if (s.includes('BTC') || s.includes('ETH') || s.includes('USDT') || 
      s.includes('USD') && (s.includes('COIN') || s.includes('CRYPTO'))) {
    return 'Crypto';
  }
  
  // Futures (common symbols)
  if (s.includes('NQ') || s.includes('ES') || s.includes('YM') || 
      s.includes('RTY') || s.includes('CL') || s.includes('GC')) {
    return 'Futures';
  }
  
  // Stock symbols (typically 1-5 characters)
  if (/^[A-Z]{1,5}$/.test(s)) {
    return 'Stocks';
  }
  
  return 'Forex'; // default
}

// AI-powered strategy detection
export async function detectStrategy(tradeData, userStrategies = []) {
  try {
    const { symbol, side, entry_price, exit_price, pnl, stop_loss, take_profit, quantity } = tradeData;
    
    const strategiesContext = userStrategies.length > 0 
      ? `User's known strategies: ${userStrategies.map(s => s.name).join(', ')}`
      : '';
    
    const prompt = `Analyze this trade and suggest the most likely trading strategy used:
Symbol: ${symbol}
Side: ${side}
Entry: ${entry_price}
Exit: ${exit_price}
P&L: ${pnl}
Stop Loss: ${stop_loss || 'Not set'}
Take Profit: ${take_profit || 'Not set'}
${strategiesContext}

Based on the trade parameters, suggest ONE strategy name (e.g., "Breakout", "Scalping", "Swing Trading", "Mean Reversion", "Trend Following", "Support/Resistance").
Return ONLY the strategy name, nothing else.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });
    
    return result.trim();
  } catch (error) {
    console.error('Strategy detection error:', error);
    return '';
  }
}

// AI-powered trade notes generation
export async function generateTradeNotes(tradeData) {
  try {
    const { symbol, side, entry_price, exit_price, pnl, stop_loss, take_profit, strategy, quantity } = tradeData;
    
    const outcome = pnl > 0 ? 'winning' : pnl < 0 ? 'losing' : 'breakeven';
    const riskReward = stop_loss && take_profit 
      ? `R:R ${(Math.abs(take_profit - entry_price) / Math.abs(entry_price - stop_loss)).toFixed(2)}`
      : '';
    
    const prompt = `Generate concise trade journal notes for this ${outcome} trade:
Symbol: ${symbol}
Side: ${side}
Entry: ${entry_price}
Exit: ${exit_price}
P&L: $${pnl}
Strategy: ${strategy || 'Unknown'}
${riskReward}

Write 2-3 sentences covering:
1. Trade setup and execution
2. Key observation (what went well or what went wrong)
3. One lesson or improvement point

Keep it professional and actionable. Maximum 100 words.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });
    
    return result.trim();
  } catch (error) {
    console.error('Notes generation error:', error);
    return '';
  }
}

// AI sentiment analysis for emotions
export async function analyzeTradeSentiment(tradeData, phase = 'before') {
  try {
    const { symbol, side, entry_price, exit_price, pnl, stop_loss, take_profit, notes } = tradeData;
    
    let context = '';
    if (phase === 'before') {
      context = `About to enter a ${side} trade on ${symbol} at ${entry_price}`;
      if (stop_loss) context += ` with stop loss at ${stop_loss}`;
      if (notes) context += `. Trader notes: ${notes.substring(0, 200)}`;
    } else if (phase === 'after') {
      const outcome = pnl > 0 ? 'won' : pnl < 0 ? 'lost' : 'broke even';
      context = `Just exited ${side} trade on ${symbol}. Entered at ${entry_price}, exited at ${exit_price}. ${outcome} $${Math.abs(pnl)}.`;
      if (notes) context += ` Trader notes: ${notes.substring(0, 200)}`;
    }
    
    const prompt = `Analyze the trader's emotional state ${phase} this trade based on the context:
${context}

Classify the emotion into ONE of these categories:
- Confident
- Anxious
- Calm
- Excited
- Fearful
- Impatient
- Disciplined
- Impulsive
${phase === 'after' ? '- Regretful\n- Satisfied' : ''}

Return ONLY the emotion word, nothing else.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: false
    });
    
    const emotion = result.trim();
    const validEmotions = phase === 'before' 
      ? ['Confident', 'Anxious', 'Calm', 'Excited', 'Fearful', 'Impatient', 'Disciplined', 'Impulsive']
      : ['Confident', 'Anxious', 'Calm', 'Excited', 'Fearful', 'Impatient', 'Disciplined', 'Impulsive', 'Regretful', 'Satisfied'];
    
    return validEmotions.includes(emotion) ? emotion : 'Calm';
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return 'Calm';
  }
}

// Smart auto-populate all AI fields
export async function autoPopulateTradeFields(tradeData, userStrategies = []) {
  const updates = {};
  
  // Detect instrument type if not set or if symbol changed
  if (tradeData.symbol && (!tradeData.instrument_type || tradeData.instrument_type === 'Forex')) {
    updates.instrument_type = detectInstrumentType(tradeData.symbol);
  }
  
  // Only run AI operations if we have sufficient data
  const hasEnoughData = tradeData.symbol && tradeData.entry_price && tradeData.side;
  
  if (hasEnoughData) {
    const promises = [];
    
    // Detect strategy if not set
    if (!tradeData.strategy && tradeData.pnl !== undefined) {
      promises.push(
        detectStrategy(tradeData, userStrategies)
          .then(strategy => { updates.strategy = strategy; })
      );
    }
    
    // Generate notes if not set and trade is complete
    if (!tradeData.notes && tradeData.exit_price && tradeData.pnl !== undefined) {
      promises.push(
        generateTradeNotes(tradeData)
          .then(notes => { updates.notes = notes; })
      );
    }
    
    // Analyze emotion before trade if not set
    if (!tradeData.emotion_before || tradeData.emotion_before === 'Calm') {
      promises.push(
        analyzeTradeSentiment(tradeData, 'before')
          .then(emotion => { updates.emotion_before = emotion; })
      );
    }
    
    // Analyze emotion after trade if trade is complete and not set
    if (tradeData.exit_price && tradeData.pnl !== undefined && !tradeData.emotion_after) {
      promises.push(
        analyzeTradeSentiment(tradeData, 'after')
          .then(emotion => { updates.emotion_after = emotion; })
      );
    }
    
    await Promise.all(promises);
  }
  
  return updates;
}