import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { listLocalSounds, saveLocalSound, deleteLocalSound, makeLocalSound } from '@/lib/alertSounds';

// Unified sound list = local (IndexedDB) + cloud (CustomAudioAlert entity).
// Cloud sounds are only created on paid plans; everyone can play cloud sounds
// that already exist, and everyone gets unlimited local sounds.
export function useAlertSounds() {
  const [sounds, setSounds] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [local, cloud] = await Promise.all([
        listLocalSounds(),
        base44.entities.CustomAudioAlert.list('-created_date', 200).catch(() => [])
      ]);
      const cloudMapped = (cloud || []).map(c => ({
        id: c.id,
        name: c.name,
        audio_url: c.audio_url,
        source: 'cloud',
        created_at: c.created_date
      }));
      setSounds([...local, ...cloudMapped]);
    } catch (e) {
      console.error('useAlertSounds refresh failed:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addLocal = useCallback(async (name, blob) => {
    const sound = makeLocalSound({ name, blob });
    await saveLocalSound(sound);
    setSounds(prev => [sound, ...prev]);
    return sound;
  }, []);

  const removeSound = useCallback(async (sound) => {
    if (sound.source === 'local') {
      await deleteLocalSound(sound.id);
    } else {
      await base44.entities.CustomAudioAlert.delete(sound.id);
    }
    setSounds(prev => prev.filter(s => s.id !== sound.id));
  }, []);

  // Upload a local sound to the cloud (paid plans only). Caller gates by isPro.
  const syncToCloud = useCallback(async (sound) => {
    const file = new File([sound.blob], `${sound.name || 'alert'}.webm`, { type: sound.blob.type || 'audio/webm' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const created = await base44.entities.CustomAudioAlert.create({
      name: sound.name,
      audio_url: file_url,
      notification_types: ['signal_new']
    });
    const cloudSound = { id: created.id, name: created.name, audio_url: created.audio_url, source: 'cloud', created_at: created.created_date };
    // Remove the local copy now that it lives in the cloud
    await deleteLocalSound(sound.id);
    setSounds(prev => [cloudSound, ...prev.filter(s => s.id !== sound.id)]);
    return cloudSound;
  }, []);

  return { sounds, loading, refresh, addLocal, removeSound, syncToCloud };
}