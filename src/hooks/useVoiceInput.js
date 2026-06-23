import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Reusable speech-to-text hook built on the Web Speech API.
 * Returns { supported, listening, interim, start, stop }.
 * onResult(finalText) fires for each finalized utterance.
 */
export function useVoiceInput({ onResult, lang = 'en-US' } = {}) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [interim, setInterim] = useState('');
  const recRef = useRef(null);
  const onResultRef = useRef(onResult);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    setSupported(true);

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;

    rec.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      setInterim(interimText);
      if (finalText && onResultRef.current) onResultRef.current(finalText.trim());
    };

    rec.onerror = (e) => {
      console.error('Speech recognition error:', e.error);
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
    };

    recRef.current = rec;
    return () => { try { rec.stop(); } catch (_) {} };
  }, [lang]);

  const start = useCallback(() => {
    if (!recRef.current) return;
    try { recRef.current.start(); setListening(true); } catch (_) {}
  }, []);

  const stop = useCallback(() => {
    if (!recRef.current) return;
    try { recRef.current.stop(); } catch (_) {}
    setListening(false);
  }, []);

  return { supported, listening, interim, start, stop };
}