import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Volume2, VolumeX, Brain, Loader2, Phone, PhoneOff, Sparkles } from 'lucide-react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import MessageBubble from '@/components/coach/MessageBubble';

/**
 * Hands-free voice conversation with the AI trading coach.
 * Speech-to-text for input, browser TTS for spoken responses,
 * and a continuous "hands-free" mode that auto-restarts listening
 * after the coach finishes speaking — no keyboard needed.
 */
export default function VoiceCoach() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [handsFree, setHandsFree] = useState(true);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const lastSpokenRef = useRef('');
  const messagesEndRef = useRef(null);
  const handsFreeRef = useRef(handsFree);
  const mutedRef = useRef(muted);

  const darkMode = document.documentElement.classList.contains('dark');

  useEffect(() => { handsFreeRef.current = handsFree; }, [handsFree]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  // Initialize conversation with the trading coach agent
  useEffect(() => {
    (async () => {
      try {
        const conv = await base44.agents.createConversation({
          agent_name: 'trading_coach',
          metadata: { name: 'Voice Coach Session', description: 'Hands-free voice coaching' }
        });
        setConversation(conv);
        setMessages(conv.messages || []);
      } catch (e) {
        console.error('Failed to start voice coach session:', e);
      }
    })();
  }, []);

  // Subscribe to conversation updates
  useEffect(() => {
    if (!conversation) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
      setThinking(false);
    });
    return () => unsub();
  }, [conversation]);

  // Speak the latest assistant message aloud
  useEffect(() => {
    if (mutedRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    const text = (last.content || '').trim();
    if (!text || text === lastSpokenRef.current) return;
    lastSpokenRef.current = text;
    speak(text);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#`>_~]/g, '').replace(/\n+/g, '. ').replace(/\s+/g, ' ').trim();
    const utter = new SpeechSynthesisUtterance(clean);
    utter.rate = 1.02;
    utter.pitch = 1;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => {
      setSpeaking(false);
      if (handsFreeRef.current) startListeningRef.current?.();
    };
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, []);

  const send = useCallback((text) => {
    const content = (text || '').trim();
    if (!content || !conversation || thinking) return;
    setThinking(true);
    stopListeningRef.current?.();
    base44.agents.addMessage(conversation, { role: 'user', content }).catch((e) => {
      console.error('Failed to send message:', e);
      setThinking(false);
    });
  }, [conversation, thinking]);

  const handleResult = useCallback((finalText) => {
    stopListeningRef.current?.();
    send(finalText);
  }, [send]);

  const { supported, listening, interim, start: startListening, stop: stopListening } = useVoiceInput({ onResult: handleResult });
  const startListeningRef = useRef(startListening);
  const stopListeningRef = useRef(stopListening);
  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);
  useEffect(() => { stopListeningRef.current = stopListening; }, [stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try { stopListening(); } catch (_) {}
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const toggleMic = () => {
    if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); }
    if (listening) stopListening();
    else startListening();
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      if (next && window.speechSynthesis) window.speechSynthesis.cancel();
      return next;
    });
  };

  const status = speaking ? 'Speaking…' : thinking ? 'Coach is thinking…' : listening ? 'Listening…' : handsFree ? 'Hands-free ready — just talk' : 'Tap the mic and ask away';

  const orbBase = 'w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500';
  const orbState = speaking
    ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-[0_0_60px_rgba(34,197,94,0.6)] scale-105'
    : thinking
      ? 'bg-gradient-to-br from-purple-500 to-fuchsia-600 shadow-[0_0_60px_rgba(168,85,247,0.6)] animate-pulse'
      : listening
        ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_60px_rgba(34,211,238,0.6)] animate-pulse'
        : 'bg-gradient-to-br from-slate-500 to-slate-700 shadow-lg';

  if (!supported) {
    return (
      <div className={`rounded-2xl border p-10 text-center ${darkMode ? 'bg-slate-950/80 border-cyan-500/20 text-slate-300' : 'bg-white border-cyan-500/30 text-slate-700'}`}>
        <MicOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-bold mb-2">Voice mode isn't supported in this browser</h3>
        <p className="text-sm">For hands-free voice, please use Chrome, Edge, or Safari on desktop/mobile.</p>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border flex flex-col ${darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30'}`}>
      {/* Orb + status */}
      <div className="flex flex-col items-center py-8 gap-4">
        <div className={`${orbBase} ${orbState}`}>
          <Brain className="h-16 w-16 text-white drop-shadow-lg" />
        </div>
        <div className="text-center">
          <p className={`text-sm font-medium ${darkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>{status}</p>
          {interim && <p className={`text-xs mt-1 italic ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>"{interim}"</p>}
        </div>
      </div>

      {/* Transcript */}
      <div className={`flex-1 overflow-y-auto px-6 pb-6 space-y-4 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`} style={{ maxHeight: '320px' }}>
        {messages.length === 0 ? (
          <div className="text-center py-6">
            <Sparkles className={`h-8 w-8 mx-auto mb-2 ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Ask about your win rate, a losing pair, or your emotions — out loud.</p>
          </div>
        ) : (
          messages.map((msg, idx) => <MessageBubble key={idx} message={msg} />)
        )}
        {thinking && (
          <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <Loader2 className="h-4 w-4 animate-spin" /> Coach is analyzing your data…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Controls */}
      <div className={`border-t p-4 flex items-center justify-center gap-3 ${darkMode ? 'border-cyan-500/20' : 'border-slate-200'}`}>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMute}
          title={muted ? 'Unmute coach voice' : 'Mute coach voice'}
          className={`h-11 w-11 ${muted ? 'opacity-50' : ''}`}
        >
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>

        <Button
          onClick={toggleMic}
          variant={listening ? 'destructive' : 'default'}
          className="h-16 w-16 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 shadow-lg shadow-cyan-500/30"
          title={listening ? 'Stop listening' : 'Start talking'}
        >
          {listening ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => setHandsFree((h) => !h)}
          title={handsFree ? 'Hands-free on (auto-listen)' : 'Hands-free off'}
          className={`h-11 w-11 ${handsFree ? 'text-cyan-500 border-cyan-500/40' : ''}`}
        >
          {handsFree ? <Phone className="h-5 w-5" /> : <PhoneOff className="h-5 w-5" />}
        </Button>
      </div>
      <p className={`text-center text-xs pb-3 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {handsFree ? 'Hands-free on — the coach will listen again after replying' : 'Tap the mic for each question'}
      </p>
    </div>
  );
}