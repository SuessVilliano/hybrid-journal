import { useState, useRef, useCallback, useEffect } from 'react';

// Evaluate rules against a signal and play the matching sound/voice/flash.
// First matching rule (by priority_order) wins. Requires the user to have
// unlocked audio (browser autoplay policy).

function fillTemplate(tpl, signal) {
  const map = {
    action: signal.action || '',
    symbol: signal.symbol || '',
    tf: signal.timeframe || '',
    priority: signal.priority || 'normal',
    confidence: signal.confidence ?? '',
    price: signal.price ?? '',
    message: signal.notes || signal.strategy || '',
    provider: signal.provider || ''
  };
  return (tpl || '').replace(/\{(\w+)\}/g, (_, k) => map[k] ?? '');
}

export function matchRule(rules, signal) {
  const text = `${signal.symbol || ''} ${signal.action || ''} ${signal.provider || ''} ${signal.notes || ''} ${signal.strategy || ''} ${signal.priority || ''}`.toLowerCase();
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.providers?.length && !rule.providers.includes(signal.provider)) continue;
    if (rule.symbols?.length && !rule.symbols.map(s => String(s).toUpperCase()).includes(String(signal.symbol || '').toUpperCase())) continue;
    if (rule.actions?.length && !rule.actions.includes(signal.action)) continue;
    if (rule.priorities?.length && !rule.priorities.includes(signal.priority || 'normal')) continue;
    if (rule.min_confidence && (signal.confidence ?? 0) < rule.min_confidence) continue;
    if (rule.keywords?.length) {
      const kws = rule.keywords.map(k => String(k).toLowerCase());
      const mode = rule.keyword_mode || 'any';
      if (mode === 'all') { if (!kws.every(k => text.includes(k))) continue; }
      else { if (!kws.some(k => text.includes(k))) continue; }
    }
    return rule; // first match wins
  }
  return null;
}

export function useAlertPlayback(rules, sounds) {
  const [unlocked, setUnlocked] = useState(false);
  const [flash, setFlash] = useState(null);
  const audioCtxRef = useRef(null);
  const audioElsRef = useRef([]);
  const aiRef = useRef({ ready: false, tts: null, loading: false });

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(t);
  }, [flash]);

  const unlock = useCallback(() => {
    audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current.resume();
    // unlock speech synthesis too
    try { const u = new SpeechSynthesisUtterance(''); speechSynthesis.speak(u); } catch (e) {}
    setUnlocked(true);
  }, []);

  const stopAll = useCallback(() => {
    audioElsRef.current.forEach(a => { try { a.pause(); a.currentTime = 0; } catch (e) {} });
    audioElsRef.current = [];
    try { speechSynthesis.cancel(); } catch (e) {}
  }, []);

  const playSound = useCallback((sound, vol, repeat) => {
    if (!sound) return;
    const url = sound.blob ? URL.createObjectURL(sound.blob) : sound.audio_url;
    if (!url) return;
    let n = 0;
    const go = () => {
      const au = new Audio(url);
      au.volume = Math.min(1, Math.max(0, vol));
      audioElsRef.current.push(au);
      const finish = () => {
        audioElsRef.current = audioElsRef.current.filter(x => x !== au);
        n++;
        if (n < repeat) setTimeout(go, 200);
        else if (sound.blob) URL.revokeObjectURL(url);
      };
      au.onended = finish;
      au.onerror = finish;
      au.play().catch(finish);
    };
    go();
  }, []);

  const speak = useCallback((text, vol) => {
    if (!('speechSynthesis' in window) || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.volume = Math.min(1, Math.max(0, vol));
    u.rate = 1; u.pitch = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }, []);

  const loadAI = useCallback(async () => {
    if (aiRef.current.loading || aiRef.current.ready) return aiRef.current.ready;
    aiRef.current.loading = true;
    try {
      const mod = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.0/+esm');
      aiRef.current.tts = await mod.KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'q8', device: 'wasm' });
      aiRef.current.ready = true;
    } catch (e) {
      console.warn('AI voice load failed, falling back to browser voice:', e);
    }
    aiRef.current.loading = false;
    return aiRef.current.ready;
  }, []);

  const aiSpeak = useCallback(async (text, vol) => {
    const ready = await loadAI();
    if (!ready) return speak(text, vol);
    try {
      const audio = await aiRef.current.tts.generate(text, {});
      const blob = await audio.toBlob();
      const url = URL.createObjectURL(blob);
      await new Promise(res => {
        const au = new Audio(url); au.volume = Math.min(1, vol);
        audioElsRef.current.push(au);
        au.onended = () => { audioElsRef.current = audioElsRef.current.filter(x => x !== au); URL.revokeObjectURL(url); res(); };
        au.onerror = () => { res(); };
        au.play().catch(res);
      });
    } catch (e) { speak(text, vol); }
  }, [loadAI, speak]);

  const playForSignal = useCallback((signal) => {
    if (!unlocked) return;
    const rule = matchRule(rules, signal);
    if (!rule) return; // no match = silent (add a catch-all rule for a default sound)
    const vol = (rule.volume ?? 100) / 100;
    if (rule.flash) {
      setFlash(signal.action === 'SELL' ? 'rgba(239,68,68,0.45)' : 'rgba(34,197,94,0.45)');
    }
    if (rule.sound_id) {
      const snd = sounds.find(s => s.id === rule.sound_id);
      playSound(snd, vol, rule.repeat || 1);
    }
    if (rule.voice_mode && rule.voice_mode !== 'off') {
      const text = (rule.speak_mode === 'template' && rule.speak_template)
        ? fillTemplate(rule.speak_template, signal)
        : (signal.notes || signal.strategy || `${signal.action} ${signal.symbol} ${signal.priority || ''}`.trim());
      if (rule.voice_mode === 'ai') aiSpeak(text, vol); else speak(text, vol);
    }
  }, [rules, sounds, unlocked, playSound, speak, aiSpeak]);

  return { playForSignal, unlock, unlocked, flash, stopAll };
}