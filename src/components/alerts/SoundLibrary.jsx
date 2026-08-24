import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Upload, Play, Trash2, CloudUpload, Cloud, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSubscription } from '@/components/subscription/useSubscription';

export default function SoundLibrary({ sounds, soundsApi, darkMode }) {
  const { isPro } = useSubscription();
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [busy, setBusy] = useState(false);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileRef = useRef(null);

  const startRec = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = e => { if (e.data.size) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        await soundsApi.addLocal(`Voice ${new Date().toLocaleTimeString()}`, blob);
        toast.success('Voice recording saved');
      };
      rec.start();
      recRef.current = rec;
      setRecording(true); setRecSecs(0);
      timerRef.current = setInterval(() => setRecSecs(s => s + 1), 1000);
    } catch (e) { toast.error('Microphone permission needed'); }
  };

  const stopRec = () => {
    if (recRef.current) recRef.current.stop();
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await soundsApi.addLocal(file.name.replace(/\.[^.]+$/, ''), file);
      toast.success('Sound uploaded');
    } catch (err) { toast.error('Upload failed'); }
    setBusy(false);
    e.target.value = '';
  };

  const play = (s) => {
    const url = s.blob ? URL.createObjectURL(s.blob) : s.audio_url;
    const au = new Audio(url);
    au.volume = 0.9;
    au.play().catch(() => toast.error('Click "Enable alerts" first'));
    au.onended = () => { if (s.blob) URL.revokeObjectURL(url); };
  };

  const sync = async (s) => {
    if (!isPro) { toast.error('Cloud sound sync is a Pro feature — upgrade on the Pricing page.'); return; }
    setBusy(true);
    try {
      await soundsApi.syncToCloud(s);
      toast.success('Sound synced to cloud');
    } catch (err) { toast.error('Sync failed: ' + err.message); }
    setBusy(false);
  };

  const card = darkMode ? 'bg-slate-950/80 border-cyan-500/20' : 'bg-white border-cyan-500/30';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {!recording ? (
          <Button onClick={startRec} size="sm" className="bg-gradient-to-r from-cyan-500 to-purple-600">
            <Mic className="h-4 w-4 mr-1" /> Record voice
          </Button>
        ) : (
          <Button onClick={stopRec} size="sm" variant="destructive">
            <Square className="h-4 w-4 mr-1" /> Stop ({recSecs}s)
          </Button>
        )}
        <Button onClick={() => fileRef.current?.click()} size="sm" variant="outline" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
          Upload MP3/WAV
        </Button>
        <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onUpload} />
      </div>

      <p className={`text-xs ${darkMode ? 'text-cyan-400/70' : 'text-cyan-700/70'}`}>
        Sounds are stored privately in your browser. Paid plans can sync a sound to the cloud so it plays on every device.
      </p>

      <div className="space-y-2">
        {sounds.length === 0 && (
          <div className={`p-6 rounded-xl border text-center text-sm ${card} ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            No sounds yet — record your voice or upload an audio file.
          </div>
        )}
        {sounds.map(s => (
          <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border ${card}`}>
            {s.source === 'cloud' ? <Cloud className="h-4 w-4 text-cyan-400" /> : <Mic className="h-4 w-4 text-slate-400" />}
            <span className="flex-1 truncate text-sm font-medium">{s.name}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${s.source === 'cloud' ? 'bg-cyan-500/20 text-cyan-400' : darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              {s.source === 'cloud' ? 'CLOUD' : 'LOCAL'}
            </span>
            <Button size="sm" variant="ghost" onClick={() => play(s)}><Play className="h-4 w-4" /></Button>
            {s.source === 'local' && (
              <Button size="sm" variant="ghost" onClick={() => sync(s)} title="Sync to cloud">
                <CloudUpload className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => soundsApi.removeSound(s)}>
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}